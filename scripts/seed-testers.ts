// Full-restore of migrated testers into Supabase from the Base44 **Player
// entity** export (Player_export.csv) — currency/level/tier + the whole economy
// engine (upgrades, businesses, magic sauces, achievements) that the old
// "Player Activity" report lacked. Dry-run by default; pass --apply to write.
//
//   set -a; source .env; set +a        # loads SROLE + PLAYER_CSV + USERS_CSV
//   deno run --allow-net --allow-read --allow-env scripts/seed-testers.ts [--apply]
//
// Credentials / inputs (all via .env, never inline — inline logs to history):
//   SROLE       PROJECT service_role key (RLS bypass for THIS project only —
//               the narrowest credential for writing rows. Not the org PAT.)
//   PLAYER_CSV  Base44 Player entity export (default ./Player_export.csv).
//   EMAIL_CSV   The Player Activity export (has `User ID` + `Login Email`) — OR
//               a Users export (`id` + `email`). REQUIRED: the Player entity
//               keys on `created_by_id` (internal Base44 id) and carries NO
//               email, so we resolve created_by_id -> email here.
//
// Match path:  Player.created_by_id --[EMAIL_CSV: User ID -> Login Email]-->
//              email --[auth.listUsers]--> Supabase uid. Testers must already
//              have signed into the new app.
//
// Idempotency: gated on player_seed_log.scope. A row logged 'full' is terminal
// (skip unless --force); 'partial' or no row is eligible for this full pass.
// Writes are absolute SET, then the log is upserted to scope='full'.
//
// Time-relative fields are NOT restored verbatim (that would corrupt the very
// economy data this test gathers). At restore:
//   * last_business_collect / last_login_at -> now, last_daily_claim -> today
//     (no offline-income dump; daily_streak preserved via a fresh last_login).
//   * rolling stat counters (served/coins/rounds/… _today/_week/_month) -> 0,
//     last_day_reset -> today.
//   * missions rerolled fresh via buildDefaultMissions() (value:0, claimed:false)
//     rather than restoring stored progress/claimed flags.
// Absolute lifetime stats and the economy jsonb restore as-is.

import { parse } from 'jsr:@std/csv@1/parse';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildDefaultMissions } from '../supabase/functions/_shared/catalog.ts';

const REF = 'zongwrqawgaipabdgmwe';
const URL = `https://${REF}.supabase.co`;
const SROLE = Deno.env.get('SROLE');
const PLAYER_CSV = Deno.env.get('PLAYER_CSV') ?? 'Player_export.csv';
const EMAIL_CSV = Deno.env.get('EMAIL_CSV');
if (!SROLE) throw new Error('SROLE (project service_role) not set — run: set -a; source .env; set +a');
if (!EMAIL_CSV) throw new Error('EMAIL_CSV not set — path to the Player Activity export (User ID + Login Email) or a Users export (id + email)');
const APPLY = Deno.args.includes('--apply');
const FORCE = Deno.args.includes('--force'); // re-seed even if already logged 'full'

const admin = createClient(URL, SROLE, { auth: { persistSession: false } });

// --- helpers ---
const int = (v: unknown) => Math.trunc(Number(v ?? 0) || 0);
const bool = (v: unknown) => String(v ?? '').trim().toLowerCase() === 'true';
function jobj(v: unknown): Record<string, unknown> {
  try { const x = JSON.parse(String(v ?? '{}')); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
  catch { return {}; }
}
function jarr(v: unknown): unknown[] {
  try { const x = JSON.parse(String(v ?? '[]')); return Array.isArray(x) ? x : []; }
  catch { return []; }
}
type Row = Record<string, string>;
const readCsv = async (p: string) => parse(await Deno.readTextFile(p), { skipFirstRow: true }) as Row[];

// --- restore-time clamp anchors (computed once) ---
const NOW_ISO = new Date().toISOString();
const TODAY = NOW_ISO.slice(0, 10); // YYYY-MM-DD

// --- 1. Player entity: dedup create-race throwaways to most-progressed per user ---
const players = await readCsv(PLAYER_CSV);
const roundsOf = (r: Row) => int(jobj(r['stats'])['roundsPlayed']);
const score = (r: Row) => int(r['level']) * 1e12 + roundsOf(r) * 1e6 + int(r['coins']);
const best: Record<string, Row> = {};
for (const r of players) {
  const cbid = r['created_by_id'];
  if (!cbid) continue;
  if (!best[cbid] || score(r) > score(best[cbid])) best[cbid] = r;
}
const targets = Object.entries(best).filter(([, r]) => roundsOf(r) >= 3);
console.log(`Player CSV: ${players.length} rows -> ${Object.keys(best).length} distinct users -> ${targets.length} real testers (>=3 rounds)`);

// --- 2. Email join: created_by_id -> email. Accepts the Player Activity export
//        ("User ID" / "Login Email") or a Users export ("id" / "email"). ---
const joinRows = await readCsv(EMAIL_CSV);
const jcols = Object.keys(joinRows[0] ?? {});
const norm = (c: string) => c.toLowerCase().replace(/[^a-z]/g, '');
const idCol = jcols.find((c) => norm(c) === 'userid')        // Activity "User ID" == created_by_id
  ?? jcols.find((c) => norm(c) === 'id')                     // Users export "id"
  ?? jcols.find((c) => norm(c) === 'createdbyid');
const emailCol = jcols.find((c) => /email/i.test(c));
if (!idCol || !emailCol) throw new Error(`EMAIL_CSV: could not find user-id/email columns in [${jcols.join(', ')}]`);
const idToEmail: Record<string, string> = {};
for (const u of joinRows) if (u[idCol]) idToEmail[u[idCol]] = (u[emailCol] ?? '').trim().toLowerCase();
console.log(`Email join: ${joinRows.length} rows, '${idCol}' -> '${emailCol}'`);

// --- 3. email -> Supabase uid (paginate admin.listUsers) ---
const emailToId: Record<string, string> = {};
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error('listUsers error:', error.message); break; }
  for (const u of data.users) if (u.email) emailToId[u.email.toLowerCase()] = u.id;
  if (data.users.length < 1000) break;
}

console.log(APPLY ? '\n*** APPLY MODE — WILL WRITE (absolute SET) ***\n' : '\n--- DRY RUN (no writes; use --apply to write) ---\n');

// --- 4. restore each tester ---
let seeded = 0, noEmail = 0, notRegistered = 0, noPlayer = 0, already = 0;
for (const [cbid, r] of targets) {
  const email = idToEmail[cbid];
  const label = `${r['displayName']} L${r['level']} tier${r['businessTier']} coins=${r['coins']} gems=${r['gems']}`;
  if (!email) { console.log(`  SKIP (no email for created_by_id in Users export): ${label}`); noEmail++; continue; }
  const uid = emailToId[email];
  const who = `${label} <${email}>`;
  if (!uid) { console.log(`  SKIP (not signed into new app yet):   ${who}`); notRegistered++; continue; }
  const { data: player } = await admin.from('players').select('id,coins,level').eq('user_id', uid).maybeSingle();
  if (!player) { console.log(`  SKIP (registered, no player row):     ${who}`); noPlayer++; continue; }

  const { data: logged } = await admin.from('player_seed_log').select('scope').eq('user_id', uid).maybeSingle();
  if (logged?.scope === 'full' && !FORCE) {
    console.log(`  ALREADY FULLY RESTORED — NO-OP:       ${who} (current coins=${player.coins})`);
    already++; continue;
  }

  const stats = jobj(r['stats']);
  const missions = buildDefaultMissions();
  // Avatars: Base44 CDN URLs are rehosted into Storage (avatars/<created_by_id>.png)
  // by scripts/rehost-avatars.ts BEFORE cancellation; point at that stable URL.
  // Emoji/non-URL values pass through. (Run rehost-avatars.ts first, or these
  // links 404 once Base44 is gone.)
  const rawAvatar = (r['avatarEmoji'] || '').trim();
  const avatar = rawAvatar.includes('base44.com')
    ? `${URL}/storage/v1/object/public/avatars/${cbid}.png`
    : (rawAvatar || null);
  const playerPatch = {
    display_name: r['displayName'] || 'New Vendor',
    avatar_emoji: avatar,
    needs_setup: bool(r['needsSetup']),
    has_seen_tutorial: bool(r['hasSeenTutorial']),
    level: int(r['level']) || 1,
    xp: int(r['xp']),
    coins: int(r['coins']),
    gems: int(r['gems']),
    business_tier: int(r['businessTier']),
    current_location_id: int(r['currentLocationId']),
    daily_streak: int(r['dailyStreak']),
    vip: bool(r['vip']),
    vip_subscription_id: r['vipSubscriptionId'] || null,
    hourly_earnings_cap: r['hourlyEarningsCap'] ? int(r['hourlyEarningsCap']) : null,
    last_round_session_id: null, // stale round token — don't restore
    // economy jsonb — verbatim
    upgrades: jobj(r['upgrades']),
    businesses: jarr(r['businesses']),
    magic_sauces: jarr(r['magicSauces']),
    equipped_sauces: jarr(r['equippedSauces']),
    achievement_progress: jobj(r['achievementProgress']),
    // missions — rerolled fresh, not restored
    daily_missions: missions.daily,
    weekly_missions: missions.weekly,
    monthly_missions: missions.monthly,
    // time-relative — clamped so accrual/streak start clean
    last_business_collect: NOW_ISO,
    last_login_at: NOW_ISO,
    last_daily_claim: TODAY,
  };
  const statsPatch = {
    // absolute lifetime — restored
    customers_served: int(stats['customersServed']),
    perfect_orders: int(stats['perfectOrders']),
    highest_combo: int(stats['highestCombo']),
    lifetime_coins: int(stats['lifetimeCoins']),
    rounds_played: int(stats['roundsPlayed']),
    mistakes: int(stats['mistakes']),
    favored_sauce: (stats['favoredSauce'] as string) || null,
    invited_friends: int(stats['invitedFriends']),
    // rolling counters — reset so fresh missions start at 0
    served_today: 0, perfect_today: 0, max_combo_today: 0, coins_today: 0, rounds_today: 0, sauce_used_today: 0,
    served_week: 0, perfect_week: 0, max_combo_week: 0, served_month: 0,
    last_day_reset: TODAY,
  };

  console.log(`  ${APPLY ? 'RESTORE' : 'WOULD RESTORE'}: ${who}`);
  console.log(`      coins ${player.coins}->${playerPatch.coins}, level ${player.level}->${playerPatch.level}, ` +
    `upgrades=${Object.keys(playerPatch.upgrades).length} businesses=${playerPatch.businesses.length} ` +
    `sauces=${playerPatch.magic_sauces.length} achievements=${Object.keys(playerPatch.achievement_progress).length}`);
  console.log(`      CLAMP last_business_collect ${r['lastBusinessCollect'] || '∅'} -> ${playerPatch.last_business_collect}`);
  console.log(`      CLAMP last_login_at         ${r['lastLoginAt'] || '∅'} -> ${playerPatch.last_login_at}`);
  console.log(`      CLAMP last_daily_claim      ${r['lastDailyClaim'] || '∅'} -> ${playerPatch.last_daily_claim}`);
  console.log(`      REROLL missions fresh (d=${playerPatch.daily_missions.length}/w=${playerPatch.weekly_missions.length}/m=${playerPatch.monthly_missions.length}); RESET rolling stat counters -> 0`);
  console.log(`      AVATAR ${rawAvatar.includes('base44.com') ? '-> ' + avatar + ' (requires rehost-avatars.ts)' : (avatar ?? '(none)')}`);
  if (APPLY) {
    const e1 = (await admin.from('players').update(playerPatch).eq('user_id', uid)).error;
    const e2 = (await admin.from('player_stats').update(statsPatch).eq('player_id', player.id)).error;
    if (e1 || e2) { console.log(`      ERROR: ${e1?.message ?? ''} ${e2?.message ?? ''}`); continue; }
    // Keep leaderboard rows in sync with the restored identity. ensure-player /
    // finalize-round may have snapshotted the fresh (pre-restore) avatar/name/
    // level when the account first signed in; refresh those columns (scores are
    // left untouched — they're the historical bests).
    await admin.from('leaderboard_entries')
      .update({
        avatar_emoji: playerPatch.avatar_emoji,
        display_name: playerPatch.display_name,
        level: playerPatch.level,
        business_tier: playerPatch.business_tier,
      })
      .eq('owner_id', uid);
    await admin.from('player_seed_log').upsert(
      { user_id: uid, email, scope: 'full', note: 'full restore from Player entity export' },
      { onConflict: 'user_id' },
    );
  }
  seeded++;
}
console.log(`\nSummary: ${APPLY ? 'restored' : 'would restore'} ${seeded} | already-full/no-op ${already} | ` +
  `no-email ${noEmail} | not-signed-in ${notRegistered} | registered-no-player ${noPlayer}`);
