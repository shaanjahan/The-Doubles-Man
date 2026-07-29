// Shared cost/reward source of truth for the raw-write batch (buyUpgrade,
// claimDaily, openSaucePack, grantIAP). Faithful backend copy of the
// economically-relevant parts of src/lib/game/catalog.js — the frontend stays
// the mirror. UI-only fields (images, tailwind classes, descriptions) are
// intentionally omitted; only the numbers the server must not trust the client
// for live here.
//
// This module grows as each function in the batch lands; every table added is
// exercised by that function's tests. Currently: UPGRADES (buyUpgrade).

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
