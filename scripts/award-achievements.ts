// scripts/award-achievements.ts
//
// One-time retroactive pass for the 50-achievement dual-prize catalog
// (2026-08-03): every player who has ALREADY met an achievement's target gets
// that achievement's new cash + gems prize credited, and the achievement is
// marked claimed so the deployed evaluator never grants it a second time.
//
// Players who claimed one of the original 12 achievements under the old
// single-currency rewards keep what they got AND receive the new prize —
// forward-only, per the owner's "never touch tester data" rule.
//
// Idempotent: every awarded entry is stamped `prizeV2: true`; re-runs skip
// stamped entries. Credits run as single atomic UPDATEs (coins = coins + X)
// via the Management API so a concurrent finalize-round can't lose money.
//
// Usage:
//   set -a; source .env; set +a
//   deno run --allow-net --allow-env scripts/award-achievements.ts           # dry run
//   deno run --allow-net --allow-env scripts/award-achievements.ts --apply
//
// Needs: SROLE (service role key), SUPABASE_PAT (Management API token).

import { ACHIEVEMENTS, UPGRADES } from '../supabase/functions/_shared/catalog.ts';

const REF = 'zongwrqawgaipabdgmwe';
const URL = `https://${REF}.supabase.co`;
const SROLE = Deno.env.get('SROLE') ?? '';
const PAT = Deno.env.get('SUPABASE_PAT') ?? '';
const APPLY = Deno.args.includes('--apply');
if (!SROLE || !PAT) { console.error('SROLE and SUPABASE_PAT must be set'); Deno.exit(1); }

async function rest(path: string): Promise<any[]> {
  const r = await fetch(`${URL}${path}`, {
    headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}` },
  });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sql(query: string): Promise<any> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
      // Cloudflare rejects default fetch UAs on this endpoint (error 1010).
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`sql: ${r.status} ${await r.text()}`);
  return r.json();
}

// Same snapshot the server's evaluateAchievements builds, but from the raw
// snake_case rows (this script reads the DB directly, not the camelCase API).
function snapshotOf(p: any, s: any): Record<string, number> {
  const uniqueSauces = (p.magic_sauces || []).filter((x: any) => (x?.count || 0) > 0).length;
  const businesses: any[] = Array.isArray(p.businesses) ? p.businesses : [];
  const upgrades: Record<string, number> = p.upgrades || {};
  return {
    customersServed: s?.customers_served || 0,
    perfectOrders: s?.perfect_orders || 0,
    highestCombo: s?.highest_combo || 0,
    level: p.level || 1,
    lifetimeCoins: s?.lifetime_coins || 0,
    uniqueSauces,
    dailyStreak: p.daily_streak || 0,
    roundsPlayed: s?.rounds_played || 0,
    businessesOwned: businesses.reduce((n, b) => n + (b?.count || 0), 0),
    empireUnits: businesses.filter((b) => b?.tier === 6).reduce((n, b) => n + (b?.count || 0), 0),
    upgradesOwned: UPGRADES.filter((u) => (upgrades[u.id] || 0) >= 1).length,
    upgradeMaxed: UPGRADES.some((u) => (upgrades[u.id] || 0) >= u.maxLevel) ? 1 : 0,
    legacyLevel: upgrades.legacy || 0,
    invitedFriends: s?.invited_friends || 0,
    vip: p.vip ? 1 : 0,
  };
}

const players = await rest('/rest/v1/players?select=*&order=created_at');
const stats = await rest('/rest/v1/player_stats?select=*');
const statsById = new Map(stats.map((s) => [s.player_id, s]));

const updates: string[] = [];
let grandCoins = 0, grandGems = 0, grandCount = 0;

for (const p of players) {
  const snap = snapshotOf(p, statsById.get(p.id));
  const progress: Record<string, any> = p.achievement_progress || {};
  const patch: Record<string, any> = {};
  let coins = 0, gems = 0;
  const awarded: string[] = [];

  for (const a of ACHIEVEMENTS) {
    const cur = progress[a.id] || {};
    if (cur.prizeV2) continue;                 // already awarded by a prior run
    const v = snap[a.stat] ?? 0;
    if (v < a.target) continue;                // not met yet — server grants later
    patch[a.id] = {
      ...cur,
      value: v,
      claimed: true,
      claimedAt: cur.claimedAt || new Date().toISOString(),
      prizeV2: true,
    };
    coins += a.reward.coins;
    gems += a.reward.gems;
    awarded.push(`${a.id}(${a.tier})`);
  }

  if (!awarded.length) continue;
  grandCoins += coins; grandGems += gems; grandCount += awarded.length;
  console.log(`${(p.display_name || '(unnamed)').padEnd(16)} +$${coins.toLocaleString().padStart(11)} +${String(gems).padStart(4)} gems  (${awarded.length} achievements)`);
  console.log(`    ${awarded.join(', ')}`);
  updates.push(
    `UPDATE players SET coins = coins + ${coins}, gems = gems + ${gems}, ` +
    `achievement_progress = coalesce(achievement_progress, '{}'::jsonb) || ` +
    `$j$${JSON.stringify(patch)}$j$::jsonb WHERE id = '${p.id}';`,
  );
}

console.log(`\nTOTAL: ${grandCount} achievements, $${grandCoins.toLocaleString()} + ${grandGems} gems across ${updates.length} players`);

if (!APPLY) { console.log('\nDry run — re-run with --apply to credit.'); Deno.exit(0); }
if (updates.length) {
  await sql(updates.join('\n'));
  console.log('Applied.');
}
