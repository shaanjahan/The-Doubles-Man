// Restore each migrated tester's historical leaderboard standings into Supabase
// from the Base44 **Leaderboard** export ("The Doublesman Data - Leaderboard.csv":
// Category / Owner ID / Login Email / Display Name / Score / Location ID /
// Business Tier / Level / VIP). Dry-run by default; pass --apply to write.
//
//   set -a; source .env; set +a        # loads SROLE (+ optional LEADERBOARD_CSV)
//   deno run --allow-net --allow-read --allow-env scripts/seed-leaderboard.ts [--apply]
//
// Credentials / inputs (all via .env, never inline — inline logs to history):
//   SROLE            PROJECT service_role key (RLS bypass for THIS project only).
//   LEADERBOARD_CSV  Base44 Leaderboard export
//                    (default './The Doublesman Data - Leaderboard.csv').
//
// The export has ~287 snapshot rows per category across the testers, so we reduce
// to the MAX score per (owner, category) — the same "one best row per player per
// category" contract the live table holds. Owner metadata (name/level/tier/vip/
// location) comes from that owner's highest-Level snapshot; the avatar comes from
// the players row (authoritative, post-restore — matches what live rounds write).
//
// Match path:  Leaderboard "Owner ID" carries "Login Email" directly ->
//              [auth.listUsers] -> Supabase uid. Testers must already have signed
//              into the new app (owner_id FKs auth.users), and have a players row.
//
// Idempotency: writes go through public.leaderboard_upsert_best, an only-if-
// greater upsert keyed unique(owner_id, category). Re-running never lowers a
// score and never duplicates — so this is safe to re-run as more testers sign in.

import { parse } from 'jsr:@std/csv@1/parse';
import { createClient } from 'npm:@supabase/supabase-js@2';

const REF = 'zongwrqawgaipabdgmwe';
const URL = `https://${REF}.supabase.co`;
const SROLE = Deno.env.get('SROLE');
const LEADERBOARD_CSV = Deno.env.get('LEADERBOARD_CSV') ?? 'The Doublesman Data - Leaderboard.csv';
if (!SROLE) throw new Error('SROLE (project service_role) not set — run: set -a; source .env; set +a');
const APPLY = Deno.args.includes('--apply');

const admin = createClient(URL, SROLE, { auth: { persistSession: false } });

// --- helpers ---
const int = (v: unknown) => Math.trunc(Number(v ?? 0) || 0);
const isVip = (v: unknown) => /^(true|vip|1|yes)$/i.test(String(v ?? '').trim());
type Row = Record<string, string>;
const readCsv = async (p: string) => parse(await Deno.readTextFile(p), { skipFirstRow: true }) as Row[];

const CATEGORIES = ['round_score', 'customers_served', 'max_combo'] as const;
type Cat = typeof CATEGORIES[number];

// --- 1. Leaderboard export: reduce to best-per-owner-per-category + owner meta ---
const rows = await readCsv(LEADERBOARD_CSV);
// Tolerant column lookup (header labels have spaces / varied case).
const cols = Object.keys(rows[0] ?? {});
const norm = (c: string) => c.toLowerCase().replace(/[^a-z]/g, '');
const col = (want: string) => cols.find((c) => norm(c) === want) ?? '';
const C = {
  category: col('category'),
  owner: col('ownerid'),
  email: col('loginemail'),
  name: col('displayname'),
  score: col('score'),
  location: col('locationid'),
  tier: col('businesstier'),
  level: col('level'),
  vip: col('vip'),
};
for (const [k, v] of Object.entries(C)) {
  if (!v) throw new Error(`LEADERBOARD_CSV: missing '${k}' column in [${cols.join(', ')}]`);
}

type Owner = {
  email: string;
  best: Record<Cat, number>;
  meta: { name: string; level: number; tier: number; vip: boolean; location: number } | null;
  metaLevel: number; // level of the snapshot chosen for meta (pick highest)
};
const owners: Record<string, Owner> = {};
for (const r of rows) {
  const oid = r[C.owner];
  if (!oid) continue;
  const cat = r[C.category] as Cat;
  if (!CATEGORIES.includes(cat)) continue;
  const o = (owners[oid] ??= { email: '', best: { round_score: 0, customers_served: 0, max_combo: 0 }, meta: null, metaLevel: -1 });
  if (!o.email && r[C.email]) o.email = r[C.email].trim().toLowerCase();
  o.best[cat] = Math.max(o.best[cat], int(r[C.score]));
  // Representative metadata: the owner's highest-Level snapshot (their latest
  // progression), so the seeded row shows their real current tier/level/name.
  const lvl = int(r[C.level]);
  if (lvl > o.metaLevel) {
    o.metaLevel = lvl;
    o.meta = { name: r[C.name] || 'New Vendor', level: lvl || 1, tier: int(r[C.tier]), vip: isVip(r[C.vip]), location: int(r[C.location]) };
  }
}
const ownerIds = Object.keys(owners);
console.log(`Leaderboard CSV: ${rows.length} rows -> ${ownerIds.length} distinct owners (best score per category each)`);

// --- 2. email -> Supabase uid (paginate admin.listUsers) ---
const emailToId: Record<string, string> = {};
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error('listUsers error:', error.message); break; }
  for (const u of data.users) if (u.email) emailToId[u.email.toLowerCase()] = u.id;
  if (data.users.length < 1000) break;
}

console.log(APPLY ? '\n*** APPLY MODE — WILL WRITE (only-if-greater upsert) ***\n' : '\n--- DRY RUN (no writes; use --apply to write) ---\n');

// --- 3. seed each mappable owner via leaderboard_upsert_best ---
let seeded = 0, noEmail = 0, notRegistered = 0, noPlayer = 0;
for (const oid of ownerIds) {
  const o = owners[oid];
  const m = o.meta!;
  const label = `${m.name} L${m.level} tier${m.tier}${m.vip ? ' VIP' : ''} — round=${o.best.round_score} customers=${o.best.customers_served} combo=${o.best.max_combo}`;
  if (!o.email) { console.log(`  SKIP (no email in export):          ${label}`); noEmail++; continue; }
  const uid = emailToId[o.email];
  const who = `${label} <${o.email}>`;
  if (!uid) { console.log(`  SKIP (not signed into new app yet):  ${who}`); notRegistered++; continue; }
  // Avatar from the players row (same source finalize-round uses); may be null
  // until the player's full restore runs — the UI falls back to a default emoji.
  const { data: player } = await admin.from('players').select('id,avatar_emoji').eq('user_id', uid).maybeSingle();
  if (!player) { console.log(`  SKIP (registered, no player row):    ${who}`); noPlayer++; continue; }

  console.log(`  ${APPLY ? 'SEED' : 'WOULD SEED'}: ${who}`);
  if (APPLY) {
    const { error } = await admin.rpc('leaderboard_upsert_best', {
      p_owner_id: uid,
      p_display_name: m.name,
      p_avatar_emoji: player.avatar_emoji ?? null,
      p_location_id: m.location,
      p_business_tier: m.tier,
      p_level: m.level,
      p_vip: m.vip,
      p_round_score: o.best.round_score,
      p_customers: o.best.customers_served,
      p_max_combo: o.best.max_combo,
    });
    if (error) { console.log(`      ERROR: ${error.message}`); continue; }
  }
  seeded++;
}
console.log(`\nSummary: ${APPLY ? 'seeded' : 'would seed'} ${seeded} | no-email ${noEmail} | not-signed-in ${notRegistered} | registered-no-player ${noPlayer}`);
