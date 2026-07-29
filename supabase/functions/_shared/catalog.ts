// Shared cost/reward source of truth for the raw-write batch (buyUpgrade,
// claimDaily, openSaucePack, grantIAP). Faithful backend copy of the
// economically-relevant parts of src/lib/game/catalog.js — the frontend stays
// the mirror. UI-only fields (images, tailwind classes, descriptions) are
// intentionally omitted; only the numbers the server must not trust the client
// for live here.
//
// This module grows as each function in the batch lands; every table added is
// exercised by that function's tests. Currently: UPGRADES (buyUpgrade),
// DAILY_REWARDS + ACHIEVEMENTS + evaluateAchievements (claimDaily).

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
// keys used by evaluateAchievements below.
export interface Achievement {
  id: string;
  target: number;
  stat: string;
  reward: { coins?: number; gems?: number };
}
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'serve_100',       target: 100,     stat: 'customersServed', reward: { coins: 500 } },
  { id: 'serve_1000',      target: 1000,    stat: 'customersServed', reward: { gems: 25 } },
  { id: 'perfect_50',      target: 50,      stat: 'perfectOrders',   reward: { coins: 300 } },
  { id: 'perfect_250',     target: 250,     stat: 'perfectOrders',   reward: { gems: 20 } },
  { id: 'combo_20',        target: 20,      stat: 'highestCombo',    reward: { gems: 10 } },
  { id: 'combo_50',        target: 50,      stat: 'highestCombo',    reward: { gems: 30 } },
  { id: 'level_10',        target: 10,      stat: 'level',           reward: { coins: 800 } },
  { id: 'level_25',        target: 25,      stat: 'level',           reward: { gems: 25 } },
  { id: 'coins_1m',        target: 1000000, stat: 'lifetimeCoins',   reward: { gems: 50 } },
  { id: 'sauce_collector', target: 5,       stat: 'uniqueSauces',    reward: { gems: 15 } },
  { id: 'streak_7',        target: 7,       stat: 'dailyStreak',     reward: { gems: 30 } },
  { id: 'rounds_50',       target: 50,      stat: 'roundsPlayed',    reward: { coins: 600 } },
];

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
  const snapshot: Record<string, number> = {
    customersServed: stats.customersServed || 0,
    perfectOrders: stats.perfectOrders || 0,
    highestCombo: stats.highestCombo || 0,
    level: player.level || 1,
    lifetimeCoins: stats.lifetimeCoins || 0,
    uniqueSauces,
    dailyStreak: player.dailyStreak || 0,
    roundsPlayed: stats.roundsPlayed || 0,
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
