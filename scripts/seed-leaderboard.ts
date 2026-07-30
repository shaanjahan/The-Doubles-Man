// Load each migrated tester's historical leaderboard bests into the
// public.leaderboard_seed table from the Base44 **Leaderboard** export
// ("The Doublesman Data - Leaderboard.csv": Category / Owner ID / Login Email /
// Display Name / Score / Location ID / Business Tier / Level / VIP).
// Dry-run by default; pass --apply to write.
//
//   set -a; source .env; set +a        # loads SROLE (+ optional LEADERBOARD_CSV)
//   deno run --allow-net --allow-read --allow-env scripts/seed-leaderboard.ts [--apply]
//
// This does NOT write leaderboard_entries directly. It fills leaderboard_seed
// (keyed by email); ensure-player then applies each tester's row automatically
// the first time they sign into the new app, via leaderboard_upsert_best. That
// removes the "must already be registered" gating — we can load every tester's
// standings now, and they land the instant each one logs in.
//
// Credentials / inputs (all via .env, never inline — inline logs to history):
//   SROLE            PROJECT service_role key (RLS bypass for THIS project only).
//   LEADERBOARD_CSV  Base44 Leaderboard export
//                    (default './The Doublesman Data - Leaderboard.csv').
//
// The export has ~287 snapshot rows per category, so we reduce to the MAX score
// per (owner, category). Owner metadata (name/level/tier/vip/location) comes from
// that owner's highest-Level snapshot. Avatar is left to ensure-player (it uses
// the player's own avatar at apply time).
//
// Idempotency: upsert keyed on email. seeded_at is intentionally omitted from the
// payload so re-running refreshes scores/meta WITHOUT un-marking an already
// applied row. Safe to re-run whenever the export is refreshed.

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
const cols = Object.keys(rows[0] ?? {});
const norm = (c: string) => c.toLowerCase().replace(/[^a-z]/g, '');
const col = (want: string) => cols.find((c) => norm(c) === want) ?? '';
const C = {
  category: col('category'), owner: col('ownerid'), email: col('loginemail'),
  name: col('displayname'), score: col('score'), location: col('locationid'),
  tier: col('businesstier'), level: col('level'), vip: col('vip'),
};
for (const [k, v] of Object.entries(C)) {
  if (!v) throw new Error(`LEADERBOARD_CSV: missing '${k}' column in [${cols.join(', ')}]`);
}

type Owner = {
  email: string;
  best: Record<Cat, number>;
  meta: { name: string; level: number; tier: number; vip: boolean; location: number } | null;
  metaLevel: number;
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
  const lvl = int(r[C.level]);
  if (lvl > o.metaLevel) {
    o.metaLevel = lvl;
    o.meta = { name: r[C.name] || 'New Vendor', level: lvl || 1, tier: int(r[C.tier]), vip: isVip(r[C.vip]), location: int(r[C.location]) };
  }
}
const list = Object.values(owners);
console.log(`Leaderboard CSV: ${rows.length} rows -> ${list.length} distinct owners (best score per category each)`);

console.log(APPLY ? '\n*** APPLY MODE — WILL UPSERT leaderboard_seed ***\n' : '\n--- DRY RUN (no writes; use --apply to write) ---\n');

// --- 2. upsert into leaderboard_seed (keyed by email; seeded_at left untouched) ---
let loaded = 0, noEmail = 0;
for (const o of list) {
  const m = o.meta!;
  const label = `${m.name} L${m.level} tier${m.tier}${m.vip ? ' VIP' : ''} — round=${o.best.round_score} customers=${o.best.customers_served} combo=${o.best.max_combo}`;
  if (!o.email) { console.log(`  SKIP (no email in export): ${label}`); noEmail++; continue; }
  console.log(`  ${APPLY ? 'LOAD' : 'WOULD LOAD'}: ${label} <${o.email}>`);
  if (APPLY) {
    const { error } = await admin.from('leaderboard_seed').upsert({
      email: o.email,
      display_name: m.name,
      location_id: m.location,
      business_tier: m.tier,
      level: m.level,
      vip: m.vip,
      round_score: o.best.round_score,
      customers_served: o.best.customers_served,
      max_combo: o.best.max_combo,
    }, { onConflict: 'email' });
    if (error) { console.log(`      ERROR: ${error.message}`); continue; }
  }
  loaded++;
}
console.log(`\nSummary: ${APPLY ? 'loaded' : 'would load'} ${loaded} into leaderboard_seed | no-email ${noEmail}`);
console.log('Applied to each tester automatically by ensure-player on their next sign-in.');
