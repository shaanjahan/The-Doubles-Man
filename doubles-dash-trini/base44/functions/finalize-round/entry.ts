import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { perRoundBonus } from '../../shared/businesses.ts';

// Server-authoritative round finalization. The client USED to compute and report
// coins/gems/xp earned, which an attacker could forge to grant themselves
// unlimited currency. Instead the client now sends only the round's verifiable
// counters; the server computes a per-round reward ceiling from the player's
// real upgrades / business tier / equipped sauces / location and clamps every
// client-reported reward to that ceiling before persisting. Legit play never
// hits the ceiling — only forged (inflated) values get clamped.

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

// Indexed by player.businessTier (as in src/lib/game/catalog.js → buildConfig).
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const locationId = Number(body?.locationId) || 0;
    const loc = LOCATIONS.find((l) => l.id === locationId) || LOCATIONS[0];
    // Rounds now run until the player botches 3 orders, so survival time
    // varies. The per-round reward ceiling scales with the reported survival
    // duration (clamped) so a legit long round isn't clamped to a 60s max.
    const elapsedMs = Math.min(20 * 60 * 1000, Math.max(ROUND_MS, Math.floor(Number(body?.elapsedMs) || ROUND_MS)));

    // The client loaded this record earlier; re-read it so the server applies
    // rewards against the authoritative current state (not a stale client copy).
    const list = await base44.entities.Player.list('-created_date', 5);
    const player = list?.[0];
    if (!player) return Response.json({ error: 'No player record' }, { status: 404 });

    if (loc.unlockTier > (player.businessTier || 0)) {
      return Response.json({ error: 'Location not unlocked' }, { status: 403 });
    }

    // Replay protection: a client-generated sessionId uniquely identifies a
    // round. If we've already processed it, return the authoritative player
    // without re-granting rewards so a duplicate/replayed finalize-round call
    // can't farm the same round twice. (Defense-in-depth; the strong fix is
    // moving all economy writes server-side — see audit.)
    const sessionId = String(body?.sessionId || '');
    if (sessionId && (player.lastRoundSessionId || '') === sessionId) {
      return Response.json({ player, outcome: null, duplicate: true });
    }

    // businessTier can exceed the 5-entry array (level thresholds go to 32).
    // Clamp so a top-tier vendor keeps the highest coin multiplier instead of
    // silently falling back to 1.0x at BUSINESS_TIERS[0].
    const biz = BUSINESS_TIERS[Math.min((player.businessTier || 0), BUSINESS_TIERS.length - 1)] || BUSINESS_TIERS[0];
    const u = player.upgrades || {};
    const lvl = Math.min((player.level || 1) - 1, 20);
    const levelSpawn = Math.max(0.86, 1.1 - lvl * 0.01);

    let spawnMult = levelSpawn;
    let tipMult = 1 + (u.tips || 0) * 0.2;
    let coinMult = loc.baseReward * (1 + (u.coin_mult || 0) * 0.1) * biz.coinMult;
    const xpMult = 1 + (u.xp_mult || 0) * 0.15;
    let gemChance = 0.05;
    let doubleServe = false;

    for (const sid of (player.equippedSauces || [])) {
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
    const baseServes = Math.ceil(elapsedMs / spawnEveryMs) + 2;       // physical customers in the session
    const reportMax = Math.ceil(baseServes * (doubleServe ? 2 : 1)); // doubled serve counts
    const comboMax = reportMax;

    // Best-case legit ceiling per serve / per round. A legit player, playing
    // perfectly against the highest-tipping challenge customers, can approach
    // these values; anything above is forged and gets clamped.
    const bestTipPerServe = 3.0 * tipMult * 5 * (1 + comboMax * 0.1); // local_girl challenge, combo-scaled
    const prepSpeedMult = 1 + (u.prep_speed || 0) * 0.12;
    const bestCoinPerServe = (coinMult + bestTipPerServe) * (1 + comboMax * 0.05) * 2 * prepSpeedMult; // *2 challenge, *prepSpeed
    const coinsCap = Math.ceil(baseServes * bestCoinPerServe * (doubleServe ? 2 : 1));
    const gemsCap = Math.ceil(baseServes * 2); // at most ~2 gems per physical serve
    const xpPerServe = 15 * xpMult * (1 + comboMax * 0.05); // order length up to ~5
    const xpCap = Math.ceil(baseServes * xpPerServe * (doubleServe ? 2 : 1));

    const servedCount = clampInt(body?.servedCount, 0, reportMax);
    const perfectCount = clampInt(body?.perfectCount, 0, servedCount);
    const mistakes = clampInt(body?.mistakes, 0, reportMax);
    const maxCombo = clampInt(body?.maxCombo, 0, comboMax);
    const coinsEarned = clampInt(body?.coinsEarned, 0, coinsCap);
    const gemsEarned = clampInt(body?.gemsEarned, 0, gemsCap);
    const xpEarned = clampInt(body?.xpEarned, 0, xpCap);

    const bizBonus = perRoundBonus(Array.isArray(player.businesses) ? player.businesses : []);
    const coinsGranted = coinsEarned + bizBonus; // gameplay income is uncapped — only idle/waiting is rate-limited

    const s = player.stats || {};
    const stats: any = {
      ...s,
      customersServed: (s.customersServed || 0) + servedCount,
      perfectOrders: (s.perfectOrders || 0) + perfectCount,
      mistakes: (s.mistakes || 0) + mistakes,
      roundsPlayed: (s.roundsPlayed || 0) + 1,
      lifetimeCoins: (s.lifetimeCoins || 0) + coinsGranted,
      highestCombo: Math.max(s.highestCombo || 0, maxCombo),
      servedToday: (s.servedToday || 0) + servedCount,
      perfectToday: (s.perfectToday || 0) + perfectCount,
      maxComboToday: Math.max(s.maxComboToday || 0, maxCombo),
      coinsToday: (s.coinsToday || 0) + coinsGranted,
      roundsToday: (s.roundsToday || 0) + 1,
      servedWeek: (s.servedWeek || 0) + servedCount,
      servedMonth: (s.servedMonth || 0) + servedCount,
    };
    if (body?.sauceUsed) stats.sauceUsedToday = (s.sauceUsedToday || 0) + 1;

    const levelBefore = player.level || 1;
    let coins = (player.coins || 0) + coinsGranted;
    let gems = (player.gems || 0) + gemsEarned;
    let xp = (player.xp || 0) + xpEarned;
    let level = levelBefore;
    let levelUpCoins = 0;
    let levelUpGems = 0;
    while (xp >= xpForLevel(level)) {
      xp -= xpForLevel(level);
      level += 1;
      const lvlCoins = 100 + level * 25;
      // Gems ramp up slowly with each new level so leveling stays rewarding.
      const lvlGems = Math.max(1, Math.floor(level / 5));
      levelUpCoins += lvlCoins;
      levelUpGems += lvlGems;
      coins += lvlCoins;
      gems += lvlGems;
    }
    let tier = player.businessTier || 0;
    for (let i = 0; i < LVL_REQS.length; i++) if (level >= LVL_REQS[i]) tier = Math.max(tier, i);

    // Consume one charge of each equipped sauce for the round. Depleted sauces
    // drop out of the equipped set and the inventory.
    let magicSauces = Array.isArray(player.magicSauces) ? player.magicSauces.map((s) => ({ ...s })) : [];
    let equippedSauces = Array.isArray(player.equippedSauces) ? [...player.equippedSauces] : [];
    if (body?.sauceUsed && equippedSauces.length) {
      for (const id of equippedSauces) {
        const slot = magicSauces.find((m) => m.id === id);
        if (slot) slot.count = Math.max(0, (slot.count || 0) - 1);
      }
      equippedSauces = equippedSauces.filter((id) => {
        const slot = magicSauces.find((m) => m.id === id);
        return slot && slot.count > 0;
      });
      magicSauces = magicSauces.filter((s) => s.count > 0);
    }

    const update = { stats, coins, gems, xp, level, businessTier: tier, magicSauces, equippedSauces };
    if (sessionId) update.lastRoundSessionId = sessionId;
    await base44.asServiceRole.entities.Player.update(player.id, update);

    const score = Math.round(coinsGranted + perfectCount * 50 + maxCombo * 25);
    const base = {
      displayName: player.displayName,
      avatarEmoji: player.avatarEmoji,
      locationId,
      businessTier: tier,
      level,
      vip: !!player.vip,
      ownerId: user.id,
    };
    // Leaderboard: one row per player per category, kept at their BEST. This
    // avoids appending 3 rows every round (write-heavy at scale); instead we do
    // one read of the player's existing rows, then write only when a round
    // beats their previous best in that category. Legacy duplicate rows from
    // the old append-per-round scheme are tolerated (we keep the max as the
    // reference row) and no new duplicates are created.
    const lbEntries = [
      { category: 'round_score', score },
      { category: 'customers_served', score: servedCount },
      { category: 'max_combo', score: maxCombo },
    ];
    try {
      const existing = await base44.asServiceRole.entities.LeaderboardEntry.filter({ ownerId: user.id });
      const byCat = new Map();
      for (const r of (existing || [])) {
        const c = r.category;
        if (!byCat.has(c) || (r.score || 0) > (byCat.get(c).score || 0)) byCat.set(c, r);
      }
      await Promise.all(lbEntries.map(async (e) => {
        const cur = byCat.get(e.category);
        if (cur && (cur.score || 0) >= e.score) return; // not a new best — skip the write
        const row = { ...base, category: e.category, score: e.score };
        if (cur) await base44.asServiceRole.entities.LeaderboardEntry.update(cur.id, row);
        else await base44.asServiceRole.entities.LeaderboardEntry.create(row);
      }));
    } catch (lbErr) {
      console.error('leaderboard upsert error:', lbErr);
    }

    return Response.json({
      player: { ...player, ...update },
      outcome: {
        servedCount, perfectCount, mistakes, maxCombo,
        coinsEarned: coinsGranted, gemsEarned, xpEarned,
        locationId, score, businessBonus: bizBonus,
        levelBefore, levelAfter: level,
        xpAfter: xp, xpForNext: xpForLevel(level),
        levelUpCoins, levelUpGems,
      },
    });
  } catch (error) {
    console.error('finalize-round error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});