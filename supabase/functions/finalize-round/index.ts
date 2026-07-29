// supabase/functions/finalize-round/index.ts
//
// Server-authoritative round finalization. Ported from the Base44
// `finalize-round` function, preserving its security model verbatim:
// the client sends only the round's verifiable counters; the server computes a
// per-round reward CEILING from the player's real upgrades / business tier /
// equipped sauces / location and clamps every client-reported reward to that
// ceiling before persisting. Legit play never hits the ceiling — only forged
// (inflated) values get clamped.
//
// Differences from the Base44 original, all deliberate:
//   * Player state is split across Supabase tables (players / player_stats /
//     earnings_log) instead of one Base44 doc. The reward MATH is unchanged;
//     the persistence is re-plumbed.
//   * The economy write (cap enforcement + players + player_stats +
//     earnings_log) runs in a single transactional RPC (finalize_round_apply)
//     so concurrent finalize calls can't double-grant or double-spend the
//     hourly headroom. The session-id replay guard is re-checked under lock
//     inside that RPC.
//   * The hourly earnings cap — present in Base44's hourlyCap.ts but never
//     actually called — is now wired in (inside the RPC, table-backed).
//   * Response is mapped back to the Base44 camelCase shape the frontend
//     expects (usePlayer.js), including a nested `stats` object assembled from
//     the player_stats row.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { perRoundBonus } from '../_shared/businesses.ts';
import { evaluateAchievements } from '../_shared/catalog.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ROUND_MS = 60000;

const LOCATIONS = [
  { id: 0, unlockTier: 0, baseReward: 6,  arriveSec: 4.4 },
  { id: 1, unlockTier: 1, baseReward: 8,  arriveSec: 4.0 },
  { id: 2, unlockTier: 2, baseReward: 11, arriveSec: 3.8 },
  { id: 3, unlockTier: 3, baseReward: 15, arriveSec: 3.6 },
  { id: 4, unlockTier: 4, baseReward: 20, arriveSec: 3.4 },
  { id: 5, unlockTier: 5, baseReward: 28, arriveSec: 3.2 },
  { id: 6, unlockTier: 6, baseReward: 40, arriveSec: 3.0 },
  { id: 7, unlockTier: 3, baseReward: 13, arriveSec: 3.7 },
];

// Indexed by player.business_tier (as in src/lib/game/catalog.js → buildConfig).
const BUSINESS_TIERS = [
  { coinMult: 1.0 },
  { coinMult: 1.2 },
  { coinMult: 1.5 },
  { coinMult: 2.2 },
  { coinMult: 3.0 },
];

function xpForLevel(level: number): number {
  return Math.floor(80 * Math.pow(1.18, level - 1));
}
const LVL_REQS = [1, 5, 9, 14, 19, 25, 32];

function clampInt(v: any, lo: number, hi: number): number {
  const n = Math.floor(Number(v) || 0);
  return Math.max(lo, Math.min(hi, n));
}

// snake_case DB row -> camelCase (TOP-LEVEL keys only; jsonb values such as
// `upgrades` / `magic_sauces` keep their internal keys, which the game logic
// uses verbatim on both client and server).
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
function camelizeKeys(row: Record<string, any> | null): Record<string, any> {
  const out: Record<string, any> = {};
  if (!row) return out;
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}

// Shape the authoritative rows back into the Base44 player contract the
// frontend consumes: camelCase player with a nested camelCase `stats` object.
function toClientPlayer(playerRow: Record<string, any>, statsRow: Record<string, any> | null) {
  return { ...camelizeKeys(playerRow), stats: camelizeKeys(statsRow) };
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Confirm identity against the caller's own JWT.
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const locationId = Number(body?.locationId) || 0;
    const loc = LOCATIONS.find((l) => l.id === locationId) || LOCATIONS[0];
    // Rounds run until the player botches 3 orders, so survival time varies.
    // The reward ceiling scales with reported (clamped) survival duration.
    const elapsedMs = Math.min(20 * 60 * 1000, Math.max(ROUND_MS, Math.floor(Number(body?.elapsedMs) || ROUND_MS)));

    // Load the caller's authoritative player row.
    const { data: player, error: selErr } = await admin
      .from('players').select('*').eq('user_id', user.id).maybeSingle();
    if (selErr) throw selErr;
    if (!player) return Response.json({ error: 'No player record' }, { status: 404 });

    if (loc.unlockTier > (player.business_tier || 0)) {
      return Response.json({ error: 'Location not unlocked' }, { status: 403 });
    }

    // Replay guard fast-path (the RPC re-checks under row lock authoritatively).
    const sessionId = String(body?.sessionId || '');
    if (sessionId && (player.last_round_session_id || '') === sessionId) {
      const { data: stats0 } = await admin
        .from('player_stats').select('*').eq('player_id', player.id).maybeSingle();
      return Response.json({ player: toClientPlayer(player, stats0), outcome: null, duplicate: true });
    }

    // ---- Per-round reward ceiling (ported verbatim from Base44) ----
    // business_tier can exceed the 5-entry array; clamp so a top-tier vendor
    // keeps the highest coin multiplier instead of falling back to 1.0x.
    const biz = BUSINESS_TIERS[Math.min((player.business_tier || 0), BUSINESS_TIERS.length - 1)] || BUSINESS_TIERS[0];
    const u = player.upgrades || {};
    const lvl = Math.min((player.level || 1) - 1, 20);
    const levelSpawn = Math.max(0.86, 1.1 - lvl * 0.01);

    let spawnMult = levelSpawn;
    let tipMult = 1 + (u.tips || 0) * 0.2;
    let coinMult = loc.baseReward * (1 + (u.coin_mult || 0) * 0.1) * biz.coinMult;
    const xpMult = 1 + (u.xp_mult || 0) * 0.15;
    let gemChance = 0.05;
    let doubleServe = false;

    for (const sid of (player.equipped_sauces || [])) {
      switch (sid) {
        case 'ghost_pepper': spawnMult *= 1.66; break;
        case 'pepper_fairy': tipMult *= 1.3; break;
        case 'golden_tamarind': coinMult *= 2.0; break;
        case 'lucky_sauce': gemChance *= 3; break;
        case 'double_trouble': doubleServe = true; break;
        default: break;
      }
    }

    const spawnEveryMs = Math.max(800, Math.round(loc.arriveSec * 1000 * spawnMult));
    const baseServes = Math.ceil(elapsedMs / spawnEveryMs) + 2;
    const reportMax = Math.ceil(baseServes * (doubleServe ? 2 : 1));
    const comboMax = reportMax;

    const bestTipPerServe = 3.0 * tipMult * 5 * (1 + comboMax * 0.1);
    const prepSpeedMult = 1 + (u.prep_speed || 0) * 0.12;
    const bestCoinPerServe = (coinMult + bestTipPerServe) * (1 + comboMax * 0.05) * 2 * prepSpeedMult;
    const coinsCap = Math.ceil(baseServes * bestCoinPerServe * (doubleServe ? 2 : 1));
    const gemsCap = Math.ceil(baseServes * 2);
    const xpPerServe = 15 * xpMult * (1 + comboMax * 0.05);
    const xpCap = Math.ceil(baseServes * xpPerServe * (doubleServe ? 2 : 1));

    const servedCount = clampInt(body?.servedCount, 0, reportMax);
    const perfectCount = clampInt(body?.perfectCount, 0, servedCount);
    const mistakes = clampInt(body?.mistakes, 0, reportMax);
    const maxCombo = clampInt(body?.maxCombo, 0, comboMax);
    const coinsEarned = clampInt(body?.coinsEarned, 0, coinsCap);
    const gemsEarned = clampInt(body?.gemsEarned, 0, gemsCap);
    const xpEarned = clampInt(body?.xpEarned, 0, xpCap);

    const bizBonus = perRoundBonus(Array.isArray(player.businesses) ? player.businesses : []);

    // Level-up loop (drives coins/gems milestones from XP; independent of the
    // coin cap). Produces the absolute new level/xp/tier + level-up bonuses.
    const levelBefore = player.level || 1;
    let xp = (player.xp || 0) + xpEarned;
    let level = levelBefore;
    let levelUpCoins = 0;
    let levelUpGems = 0;
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level += 1;
      levelUpCoins += 100 + level * 25;
      levelUpGems += Math.max(1, Math.floor(level / 5));
    }
    let tier = player.business_tier || 0;
    for (let i = 0; i < LVL_REQS.length; i++) if (level >= LVL_REQS[i]) tier = Math.max(tier, i);

    // Consume one charge of each equipped sauce for the round; depleted sauces
    // drop out of the equipped set and inventory.
    let magicSauces = Array.isArray(player.magic_sauces) ? player.magic_sauces.map((s: any) => ({ ...s })) : [];
    let equippedSauces = Array.isArray(player.equipped_sauces) ? [...player.equipped_sauces] : [];
    if (body?.sauceUsed && equippedSauces.length) {
      for (const id of equippedSauces) {
        const slot = magicSauces.find((m: any) => m.id === id);
        if (slot) slot.count = Math.max(0, (slot.count || 0) - 1);
      }
      equippedSauces = equippedSauces.filter((id: string) => {
        const slot = magicSauces.find((m: any) => m.id === id);
        return slot && slot.count > 0;
      });
      magicSauces = magicSauces.filter((s: any) => s.count > 0);
    }

    // ---- Atomic economy write (cap + players + player_stats + earnings_log) ----
    const { data: applied, error: rpcErr } = await admin.rpc('finalize_round_apply', {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_coins_earned: coinsEarned,
      p_biz_bonus: bizBonus,
      p_gems_earned: gemsEarned,
      p_level_up_coins: levelUpCoins,
      p_level_up_gems: levelUpGems,
      p_new_xp: xp,
      p_new_level: level,
      p_new_tier: tier,
      p_new_magic_sauces: magicSauces,
      p_new_equipped_sauces: equippedSauces,
      p_served: servedCount,
      p_perfect: perfectCount,
      p_mistakes: mistakes,
      p_max_combo: maxCombo,
      p_sauce_used: !!body?.sauceUsed,
    });
    if (rpcErr) throw rpcErr;
    if (!applied || applied.error) {
      return Response.json({ error: applied?.error || 'finalize failed' }, { status: 500 });
    }

    const newPlayer = applied.player;
    const newStats = applied.stats;
    const coinsGranted = Number(applied.coins_granted) || 0;

    if (applied.duplicate) {
      return Response.json({ player: toClientPlayer(newPlayer, newStats), outcome: null, duplicate: true });
    }

    const score = Math.round(coinsGranted + perfectCount * 50 + maxCombo * 25);

    // Leaderboard: best-effort, AFTER the economy commit (a failure here must
    // never roll back the player's rewards — Base44 treated it as non-fatal).
    try {
      const { error: lbErr } = await admin.rpc('leaderboard_upsert_best', {
        p_owner_id: user.id,
        p_display_name: newPlayer.display_name,
        p_avatar_emoji: newPlayer.avatar_emoji,
        p_location_id: locationId,
        p_business_tier: newPlayer.business_tier,
        p_level: newPlayer.level,
        p_vip: !!newPlayer.vip,
        p_round_score: score,
        p_customers: servedCount,
        p_max_combo: maxCombo,
      });
      if (lbErr) console.error('leaderboard upsert error:', lbErr);
    } catch (lbErr) {
      console.error('leaderboard upsert error:', lbErr);
    }

    // Achievements folded server-side (retrofit): evaluate against the
    // authoritative post-round state and grant idempotently via the shared
    // achievements_apply RPC. Round stats (customersServed, perfectOrders,
    // highestCombo, roundsPlayed) and level-ups are already applied by
    // finalize_round_apply, so this catches round-driven unlocks. Missions stay
    // client-side for now (deferred to the daily-reset follow-up).
    let finalPlayer = newPlayer;
    let finalStats = newStats;
    const ach = evaluateAchievements(camelizeKeys(newPlayer), camelizeKeys(newStats));
    if (ach.grants.length || Object.keys(ach.progressUpdates).length) {
      const { data: after, error: achErr } = await admin.rpc('achievements_apply', {
        p_user_id: user.id,
        p_grants: ach.grants,
        p_progress: ach.progressUpdates,
      });
      if (achErr) throw achErr;
      if (after && !after.error) {
        finalPlayer = after.player;
        finalStats = after.stats;
      }
    }

    return Response.json({
      // `player` is the authoritative final state (round rewards + achievement
      // grants). `outcome` describes the ROUND only, so it keeps referencing the
      // post-round (pre-achievement) level/xp/coinsGranted.
      player: toClientPlayer(finalPlayer, finalStats),
      outcome: {
        servedCount, perfectCount, mistakes, maxCombo,
        coinsEarned: coinsGranted, gemsEarned, xpEarned,
        locationId, score, businessBonus: bizBonus,
        levelBefore, levelAfter: newPlayer.level,
        xpAfter: newPlayer.xp, xpForNext: xpForLevel(newPlayer.level),
        levelUpCoins, levelUpGems,
        hourlyLimited: !!applied.limited,
      },
      newAchievements: ach.newly,
    });
  } catch (error) {
    console.error('finalize-round error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
