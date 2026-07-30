// Seed migrated tester balances into Supabase from the Base44 "Player Activity"
// CSV. Matches by EMAIL to each tester's Supabase account (which must already
// exist — i.e. they've signed into the new app). Dedups the time-series CSV to
// each email's most-progressed row. Dry-run by default; pass --apply to write.
//
//   deno run --allow-net --allow-env --allow-read seed_testers.ts [--apply]
//
// Env: SROLE (service_role key), CSV (path). Partial restore: currency / level /
// tier / location / vip / streak + lifetime stats. Does NOT touch upgrades /
// magic_sauces / businesses / achievements (not in this export).

import { createClient } from 'npm:@supabase/supabase-js@2';

const URL = 'https://zongwrqawgaipabdgmwe.supabase.co';
const SROLE = Deno.env.get('SROLE')!;
const CSV = Deno.env.get('CSV')!;
const APPLY = Deno.args.includes('--apply');
const FORCE = Deno.args.includes('--force'); // re-seed even if not at creation defaults

const admin = createClient(URL, SROLE, { auth: { persistSession: false } });

// --- parse CSV (quote-aware enough for this export) ---
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const split = (l: string) => {
    const out: string[] = []; let cur = '', q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur); return out;
  };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => { const c = split(l); return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? '').trim()])); });
}

const int = (v: string) => Math.trunc(Number(v) || 0);

// --- dedup to the most-progressed row per email (rounds, then lifetime coins) ---
const rows = parseCSV(await Deno.readTextFile(CSV));
const best: Record<string, Record<string, string>> = {};
for (const r of rows) {
  const email = (r['Login Email'] || '').trim().toLowerCase();
  if (!email) continue;
  const cur = best[email];
  const score = (x: Record<string, string>) => int(x['Rounds Played']) * 1e12 + int(x['Lifetime Coins']);
  if (!cur || score(r) > score(cur)) best[email] = r;
}
// "8 real testers" = deduped, rounds >= 3
const targets = Object.entries(best).filter(([, r]) => int(r['Rounds Played']) >= 3);
console.log(`CSV: ${rows.length} rows -> ${Object.keys(best).length} distinct emails -> ${targets.length} targets (>=3 rounds)`);
console.log(APPLY ? '\n*** APPLY MODE — WILL WRITE ***\n' : '\n--- DRY RUN (no writes; use --apply to write) ---\n');

// --- resolve emails -> Supabase user ids (paginate admin.listUsers) ---
const emailToId: Record<string, string> = {};
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error('listUsers error:', error.message); break; }
  for (const u of data.users) if (u.email) emailToId[u.email.toLowerCase()] = u.id;
  if (data.users.length < 1000) break;
}

let seeded = 0, notRegistered = 0, noPlayer = 0, alreadySeeded = 0;
for (const [email, r] of targets) {
  const uid = emailToId[email];
  const label = `${r['Display Name']} <${email}> L${r['Level']} tier${r['Business Tier']} coins=${r['Coins']} gems=${r['Gems']}`;
  if (!uid) { console.log(`  SKIP (not signed in yet):        ${label}`); notRegistered++; continue; }
  const { data: player } = await admin.from('players').select('id,coins,gems,level,xp').eq('user_id', uid).maybeSingle();
  if (!player) { console.log(`  SKIP (registered, no player row): ${label}`); noPlayer++; continue; }

  // Idempotent + non-clobbering: only seed a player still at creation defaults
  // (a freshly-signed-in tester). Anyone already seeded OR who has since played
  // is left alone (no-op) unless --force. The write itself is an absolute SET,
  // never an add.
  const isFresh = player.coins === 250 && player.gems === 10 && player.level === 1 && (player.xp ?? 0) === 0;
  if (!isFresh && !FORCE) {
    console.log(`  ALREADY SEEDED / has progress — NO-OP:  ${label} (current coins=${player.coins})`);
    alreadySeeded++; continue;
  }

  const playerPatch = {
    display_name: r['Display Name'] || 'New Vendor',
    level: int(r['Level']) || 1,
    xp: int(r['XP']),
    coins: int(r['Coins']),
    gems: int(r['Gems']),
    business_tier: int(r['Business Tier']),
    current_location_id: int(r['Location ID']),
    vip: (r['VIP'] || '').trim().toUpperCase() === 'VIP',
    daily_streak: int(r['Daily Streak']),
    last_login_at: r['Last Login'] || null,
  };
  const statsPatch = {
    rounds_played: int(r['Rounds Played']),
    customers_served: int(r['Customers Served']),
    perfect_orders: int(r['Perfect Orders']),
    mistakes: int(r['Mistakes']),
    highest_combo: int(r['Highest Combo']),
    lifetime_coins: int(r['Lifetime Coins']),
  };
  console.log(`  ${APPLY ? 'SEED' : 'WOULD SEED'}: ${label}`);
  console.log(`      players.coins ${player.coins}->${playerPatch.coins}, gems ${player.gems}->${playerPatch.gems}, level ${player.level}->${playerPatch.level}`);
  if (APPLY) {
    const e1 = (await admin.from('players').update(playerPatch).eq('user_id', uid)).error;
    const e2 = (await admin.from('player_stats').update(statsPatch).eq('player_id', player.id)).error;
    if (e1 || e2) { console.log(`      ERROR: ${e1?.message || ''} ${e2?.message || ''}`); continue; }
  }
  seeded++;
}
console.log(`\nSummary: ${APPLY ? 'seeded' : 'would seed'} ${seeded} | already-seeded/no-op ${alreadySeeded} | not-signed-in ${notRegistered} | registered-no-player ${noPlayer}`);
