// Shared cost/reward source of truth for the raw-write batch (buyUpgrade,
// claimDaily, openSaucePack, grantIAP). Faithful backend copy of the
// economically-relevant parts of src/lib/game/catalog.js — the frontend stays
// the mirror. UI-only fields (images, tailwind classes, descriptions) are
// intentionally omitted; only the numbers the server must not trust the client
// for live here.
//
// This module grows as each function in the batch lands; every table added is
// exercised by that function's tests. Currently: UPGRADES (buyUpgrade),
// DAILY_REWARDS + ACHIEVEMENTS + evaluateAchievements (claimDaily),
// MAGIC_SAUCES + SAUCE_PACK_GEM_COST + rollSaucePack (openSaucePack).

export interface Upgrade {
  id: string;
  name: string;
  baseCost: number;
  growth: number;
  maxLevel: number;
  step: number;
}

// Mirrors catalog.js UPGRADES (id / baseCost / growth / maxLevel / step).
export const UPGRADES: Upgrade[] = [
  { id: 'prep_speed',   name: 'Tanty Power',     baseCost: 250,  growth: 1.9, maxLevel: 8, step: 0.12 },
  { id: 'patience',     name: 'Calypso Music',   baseCost: 300,  growth: 1.9, maxLevel: 8, step: 0.15 },
  { id: 'tips',         name: 'Polished Tip Jar', baseCost: 350,  growth: 2.0, maxLevel: 8, step: 0.20 },
  { id: 'coin_mult',    name: 'Brass Cash Box',  baseCost: 600,  growth: 2.1, maxLevel: 8, step: 0.10 },
  { id: 'xp_mult',      name: 'Recipe Notebook', baseCost: 700,  growth: 2.1, maxLevel: 8, step: 0.15 },
  { id: 'station',      name: 'Wider Stall',     baseCost: 1500, growth: 2.5, maxLevel: 2, step: 1 },
  { id: 'gem_luck',     name: 'Lucky Mango',     baseCost: 900,  growth: 2.0, maxLevel: 5, step: 0.03 },
  { id: 'combo_master', name: 'Fire Shoes',      baseCost: 1100, growth: 2.1, maxLevel: 5, step: 0.02 },
  { id: 'auto_bless',   name: "Gran's Blessing", baseCost: 1300, growth: 2.3, maxLevel: 3, step: 1 },
  // Endless-horizon coin sink (+2% dollars/level, permanent). Mirrors
  // catalog.js; finalize-round factors it into the coin cap.
  { id: 'legacy',       name: 'Doubles Legacy',  baseCost: 500000, growth: 2.8, maxLevel: 10, step: 0.02 },
];

export function getUpgrade(id: string): Upgrade | undefined {
  return UPGRADES.find((u) => u.id === id);
}

export function upgradeCost(upg: Upgrade, currentLevel: number): number {
  return Math.floor(upg.baseCost * Math.pow(upg.growth, currentLevel));
}

// ---- Daily rewards (claimDaily) ----
// Mirrors catalog.js DAILY_REWARDS (the game-hook / Player-model table — NOT
// the dead claim-daily-reward/PlayerProfile table). Streak caps at day 7.
export interface DailyReward {
  day: number;
  coins?: number;
  gems?: number;
  xp?: number;
  magicSauce?: string;
}
export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, coins: 100 },
  { day: 2, coins: 150 },
  { day: 3, coins: 200, xp: 30 },
  { day: 4, gems: 5 },
  { day: 5, coins: 300, xp: 50 },
  { day: 6, magicSauce: 'lucky_sauce' },
  { day: 7, gems: 20, magicSauce: 'golden_tamarind' },
];

// ---- Achievements ----
// Mirrors catalog.js ACHIEVEMENTS. `stat` names match the camelCase snapshot
// keys used by evaluateAchievements below. Every achievement pays BOTH dollars
// and gems; the amounts come from its difficulty tier so prizes stay
// consistent as the catalog grows. 50 achievements total.
export type AchTier = 'starter' | 'easy' | 'medium' | 'hard' | 'veryhard' | 'legendary';

export const ACH_TIER_PRIZE: Record<AchTier, { coins: number; gems: number }> = {
  starter:   { coins: 500,    gems: 2 },
  easy:      { coins: 1500,   gems: 5 },
  medium:    { coins: 5000,   gems: 10 },
  hard:      { coins: 20000,  gems: 20 },
  veryhard:  { coins: 75000,  gems: 40 },
  legendary: { coins: 250000, gems: 75 },
};

export interface Achievement {
  id: string;
  target: number;
  stat: string;
  tier: AchTier;
  reward: { coins: number; gems: number };
}

const ACH_DEFS: { id: string; target: number; stat: string; tier: AchTier }[] = [
  // -- Starter --
  { id: 'serve_10',        target: 10,        stat: 'customersServed', tier: 'starter' },
  { id: 'serve_100',       target: 100,       stat: 'customersServed', tier: 'starter' },
  { id: 'perfect_10',      target: 10,        stat: 'perfectOrders',   tier: 'starter' },
  { id: 'combo_10',        target: 10,        stat: 'highestCombo',    tier: 'starter' },
  { id: 'level_5',         target: 5,         stat: 'level',           tier: 'starter' },
  { id: 'rounds_5',        target: 5,         stat: 'roundsPlayed',    tier: 'starter' },
  { id: 'streak_3',        target: 3,         stat: 'dailyStreak',     tier: 'starter' },
  { id: 'biz_1',           target: 1,         stat: 'businessesOwned', tier: 'starter' },
  { id: 'upgrade_1',       target: 1,         stat: 'upgradesOwned',   tier: 'starter' },
  // -- Easy --
  { id: 'serve_500',       target: 500,       stat: 'customersServed', tier: 'easy' },
  { id: 'perfect_50',      target: 50,        stat: 'perfectOrders',   tier: 'easy' },
  { id: 'combo_20',        target: 20,        stat: 'highestCombo',    tier: 'easy' },
  { id: 'level_10',        target: 10,        stat: 'level',           tier: 'easy' },
  { id: 'coins_10k',       target: 10000,     stat: 'lifetimeCoins',   tier: 'easy' },
  { id: 'rounds_50',       target: 50,        stat: 'roundsPlayed',    tier: 'easy' },
  { id: 'streak_7',        target: 7,         stat: 'dailyStreak',     tier: 'easy' },
  { id: 'sauce_3',         target: 3,         stat: 'uniqueSauces',    tier: 'easy' },
  { id: 'upgrade_5',       target: 5,         stat: 'upgradesOwned',   tier: 'easy' },
  { id: 'invite_1',        target: 1,         stat: 'invitedFriends',  tier: 'easy' },
  // -- Medium --
  { id: 'serve_1000',      target: 1000,      stat: 'customersServed', tier: 'medium' },
  { id: 'perfect_250',     target: 250,       stat: 'perfectOrders',   tier: 'medium' },
  { id: 'combo_50',        target: 50,        stat: 'highestCombo',    tier: 'medium' },
  { id: 'level_25',        target: 25,        stat: 'level',           tier: 'medium' },
  { id: 'coins_100k',      target: 100000,    stat: 'lifetimeCoins',   tier: 'medium' },
  { id: 'rounds_150',      target: 150,       stat: 'roundsPlayed',    tier: 'medium' },
  { id: 'streak_14',       target: 14,        stat: 'dailyStreak',     tier: 'medium' },
  { id: 'sauce_collector', target: 5,         stat: 'uniqueSauces',    tier: 'medium' },
  { id: 'biz_5',           target: 5,         stat: 'businessesOwned', tier: 'medium' },
  { id: 'upgrade_max',     target: 1,         stat: 'upgradeMaxed',    tier: 'medium' },
  { id: 'invite_3',        target: 3,         stat: 'invitedFriends',  tier: 'medium' },
  { id: 'vip_member',      target: 1,         stat: 'vip',             tier: 'medium' },
  // -- Hard --
  { id: 'serve_2500',      target: 2500,      stat: 'customersServed', tier: 'hard' },
  { id: 'perfect_1000',    target: 1000,      stat: 'perfectOrders',   tier: 'hard' },
  { id: 'combo_100',       target: 100,       stat: 'highestCombo',    tier: 'hard' },
  { id: 'level_50',        target: 50,        stat: 'level',           tier: 'hard' },
  { id: 'coins_1m',        target: 1000000,   stat: 'lifetimeCoins',   tier: 'hard' },
  { id: 'rounds_300',      target: 300,       stat: 'roundsPlayed',    tier: 'hard' },
  { id: 'streak_30',       target: 30,        stat: 'dailyStreak',     tier: 'hard' },
  { id: 'sauce_8',         target: 8,         stat: 'uniqueSauces',    tier: 'hard' },
  { id: 'biz_10',          target: 10,        stat: 'businessesOwned', tier: 'hard' },
  { id: 'empire_1',        target: 1,         stat: 'empireUnits',     tier: 'hard' },
  // -- Very Hard --
  { id: 'serve_5000',      target: 5000,      stat: 'customersServed', tier: 'veryhard' },
  { id: 'combo_250',       target: 250,       stat: 'highestCombo',    tier: 'veryhard' },
  { id: 'coins_10m',       target: 10000000,  stat: 'lifetimeCoins',   tier: 'veryhard' },
  { id: 'rounds_500',      target: 500,       stat: 'roundsPlayed',    tier: 'veryhard' },
  { id: 'legacy_1',        target: 1,         stat: 'legacyLevel',     tier: 'veryhard' },
  // -- Legendary --
  { id: 'serve_10000',     target: 10000,     stat: 'customersServed', tier: 'legendary' },
  { id: 'combo_500',       target: 500,       stat: 'highestCombo',    tier: 'legendary' },
  { id: 'coins_100m',      target: 100000000, stat: 'lifetimeCoins',   tier: 'legendary' },
  { id: 'legacy_5',        target: 5,         stat: 'legacyLevel',     tier: 'legendary' },
];

export const ACHIEVEMENTS: Achievement[] = ACH_DEFS.map((d) => ({
  ...d,
  reward: ACH_TIER_PRIZE[d.tier],
}));

export interface AchievementResult {
  grants: { id: string; coins: number; gems: number }[];  // newly-unlocked, for the RPC to grant idempotently
  progressUpdates: Record<string, any>;                   // achievement_progress entries to merge
  newly: string[];                                        // ids newly unlocked
}

// Faithful port of usePlayer.js evaluateAchievements. Pure: takes the
// authoritative post-mutation player + stats (camelCase) and returns what to
// grant + the achievement_progress updates. The actual grant is applied by the
// idempotent achievements_apply RPC (which re-checks the DB claimed flag), so
// evaluating on slightly stale state can never double-grant.
export function evaluateAchievements(
  player: Record<string, any>,
  stats: Record<string, any>,
): AchievementResult {
  const uniqueSauces = (player.magicSauces || []).filter((s: any) => (s?.count || 0) > 0).length;
  const businesses: any[] = Array.isArray(player.businesses) ? player.businesses : [];
  const upgrades: Record<string, number> = player.upgrades || {};
  const snapshot: Record<string, number> = {
    customersServed: stats.customersServed || 0,
    perfectOrders: stats.perfectOrders || 0,
    highestCombo: stats.highestCombo || 0,
    level: player.level || 1,
    lifetimeCoins: stats.lifetimeCoins || 0,
    uniqueSauces,
    dailyStreak: player.dailyStreak || 0,
    roundsPlayed: stats.roundsPlayed || 0,
    businessesOwned: businesses.reduce((n, b) => n + (b?.count || 0), 0),
    empireUnits: businesses.filter((b) => b?.tier === 6).reduce((n, b) => n + (b?.count || 0), 0),
    upgradesOwned: UPGRADES.filter((u) => (upgrades[u.id] || 0) >= 1).length,
    upgradeMaxed: UPGRADES.some((u) => (upgrades[u.id] || 0) >= u.maxLevel) ? 1 : 0,
    legacyLevel: upgrades.legacy || 0,
    invitedFriends: stats.invitedFriends || 0,
    vip: player.vip ? 1 : 0,
  };
  const progress = player.achievementProgress || {};
  const grants: { id: string; coins: number; gems: number }[] = [];
  const progressUpdates: Record<string, any> = {};
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    const cur = progress[a.id] || { value: 0, claimed: false };
    const v = snapshot[a.stat] ?? 0;
    if (!cur.claimed && v >= a.target) {
      progressUpdates[a.id] = { value: v, claimed: true, claimedAt: new Date().toISOString() };
      grants.push({ id: a.id, coins: a.reward.coins || 0, gems: a.reward.gems || 0 });
      newly.push(a.id);
    } else if (cur.value !== v) {
      progressUpdates[a.id] = { ...cur, value: v };
    }
  }
  return { grants, progressUpdates, newly };
}

// ---- Magic sauces / mystery pack (openSaucePack) ----
// Mirrors catalog.js MAGIC_SAUCES (id + rarity only — backend doesn't need
// names/images/effects). The gem price is the SauceShopSection PACK_COST,
// pulled server-side here so the client can never set its own cost.
export const SAUCE_PACK_GEM_COST = 15;
export const SAUCE_PACK_SIZE = 3;

export const MAGIC_SAUCES: { id: string; rarity: string }[] = [
  { id: 'golden_tamarind',    rarity: 'Rare' },
  { id: 'ghost_pepper',       rarity: 'Epic' },
  { id: 'carnival_sauce',     rarity: 'Rare' },
  { id: 'shadow_beni_spirit', rarity: 'Common' },
  { id: 'lucky_sauce',        rarity: 'Common' },
  { id: 'turbo_sauce',        rarity: 'Epic' },
  { id: 'double_trouble',     rarity: 'Legendary' },
  { id: 'pepper_fairy',       rarity: 'Common' },
];

// Faithful port of usePlayer.js randomSauceIdLite: rarity buckets then a
// uniform pick within the bucket. Runs server-side now (the client can't be
// trusted to roll its own loot).
function randomSauceId(): string {
  const r = Math.random();
  let bucket: string;
  if (r < 0.05) bucket = 'Legendary';
  else if (r < 0.2) bucket = 'Epic';
  else if (r < 0.45) bucket = 'Rare';
  else bucket = 'Common';
  const pool = MAGIC_SAUCES.filter((s) => s.rarity === bucket);
  return (pool[Math.floor(Math.random() * pool.length)] || MAGIC_SAUCES[0]).id;
}

// ---- Missions (finalize-round) ----
// Faithful port of catalog.js DAILY/WEEKLY/MONTHLY_MISSION_POOL + defaultMissions.
// Behavior confirmed against src/lib/game/usePlayer.js (2026-07-29):
//   * defaultMissions is DETERMINISTIC — pool[i % length], i.e. the first N of
//     the pool (not random). Kept as-is (decision: faithful).
//   * Only DAILY missions rotate (reset on UTC day-change). Weekly/monthly are
//     seeded once and never rotate; their week/month stat counters never reset.
//     Kept as-is (decision: faithful, no weekly/monthly rotation).
//   * bumpMissions grants coins/gems/xp on completion; xp is added WITHOUT a
//     level-up recompute. Kept faithful.
export interface Mission {
  id: string;
  desc: string;
  target: number;
  stat: string;
  reward: { coins?: number; gems?: number; xp?: number };
  value: number;
  claimed: boolean;
}
interface MissionDef { id: string; desc: string; target: number; stat: string; reward: { coins?: number; gems?: number; xp?: number }; }

export const DAILY_MISSION_POOL: MissionDef[] = [
  { id: 'dm_serve_15',  desc: 'Serve 15 customers',     target: 15,  stat: 'servedToday',    reward: { coins: 100, xp: 50 } },
  { id: 'dm_perfect_5', desc: 'Serve 5 perfect orders', target: 5,   stat: 'perfectToday',   reward: { coins: 80, gems: 2 } },
  { id: 'dm_combo_8',   desc: 'Reach a combo of 8',     target: 8,   stat: 'maxComboToday',  reward: { coins: 120, xp: 60 } },
  { id: 'dm_coins_500', desc: 'Earn 500 dollars today', target: 500, stat: 'coinsToday',     reward: { gems: 5 } },
  { id: 'dm_play_3',    desc: 'Play 3 rounds',          target: 3,   stat: 'roundsToday',    reward: { coins: 150 } },
  { id: 'dm_use_sauce', desc: 'Use a Magic Sauce',      target: 1,   stat: 'sauceUsedToday', reward: { coins: 90, xp: 40 } },
];
export const WEEKLY_MISSION_POOL: MissionDef[] = [
  { id: 'wm_serve_100', desc: 'Serve 100 customers this week', target: 100, stat: 'servedWeek',     reward: { coins: 500, gems: 10 } },
  { id: 'wm_invite_2',  desc: 'Invite 2 friends',              target: 2,   stat: 'invitedFriends', reward: { gems: 15 } },
  { id: 'wm_combo_30',  desc: 'Combo of 30',                   target: 30,  stat: 'maxComboWeek',   reward: { coins: 400, gems: 8 } },
];
export const MONTHLY_MISSION_POOL: MissionDef[] = [
  { id: 'mm_serve_500', desc: 'Serve 500 customers this month', target: 500, stat: 'servedMonth', reward: { gems: 40, coins: 2000 } },
];

// Deterministic first-N selection (matches usePlayer.js defaultMissions).
export function defaultMissions(pool: MissionDef[], count: number): Mission[] {
  return Array.from({ length: count }, (_v, i) => {
    const t = pool[i % pool.length];
    return { id: t.id, desc: t.desc, target: t.target, stat: t.stat, reward: t.reward, value: 0, claimed: false };
  });
}

// The fresh mission sets a player is seeded/rotated with. daily=3, weekly=2,
// monthly=1 (matches usePlayer.js ensureDefaults / Player.create).
export function buildDefaultMissions() {
  return {
    daily: defaultMissions(DAILY_MISSION_POOL, 3),
    weekly: defaultMissions(WEEKLY_MISSION_POOL, 2),
    monthly: defaultMissions(MONTHLY_MISSION_POOL, 1),
  };
}

export interface MissionBumpResult {
  daily: Mission[];
  weekly: Mission[];
  monthly: Mission[];
  grants: { coins: number; gems: number; xp: number };
  completed: string[];
}

// Server bumpMissions: max-progress + grant-on-complete. Faithful to
// usePlayer.js bumpMissions. Returns the updated lists + the reward totals for
// newly-completed missions; the idempotent missions_apply RPC does the actual
// grant (re-checking claimed against the DB so re-bumps can't double-grant).
export function evaluateMissions(
  daily: Mission[], weekly: Mission[], monthly: Mission[],
  statMap: Record<string, number>,
): MissionBumpResult {
  const grants = { coins: 0, gems: 0, xp: 0 };
  const completed: string[] = [];
  const bumpList = (list: Mission[]): Mission[] =>
    (list || []).map((m0) => {
      const m = { ...m0 };
      if (m.claimed) return m;
      if (statMap[m.stat] !== undefined) {
        m.value = Math.max(m.value || 0, statMap[m.stat]);
        if (m.value >= m.target) {
          m.claimed = true;
          grants.coins += m.reward.coins || 0;
          grants.gems += m.reward.gems || 0;
          grants.xp += m.reward.xp || 0;
          completed.push(m.id);
        }
      }
      return m;
    });
  return { daily: bumpList(daily), weekly: bumpList(weekly), monthly: bumpList(monthly), grants, completed };
}

// Roll n sauce ids (shared by the mystery pack and IAP sauce grants, so the
// drop logic never diverges).
export function rollSauces(n: number): string[] {
  return Array.from({ length: Math.max(0, n) }, () => randomSauceId());
}

// Roll one mystery pack (SAUCE_PACK_SIZE sauce ids).
export function rollSaucePack(): string[] {
  return rollSauces(SAUCE_PACK_SIZE);
}
