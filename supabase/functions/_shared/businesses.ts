// Shared idle-business configuration for The Doubles Man. Faithful copy of the
// Base44 `shared/businesses.ts`, so the finalize-round and manage-business Edge
// Functions never diverge. Frontend mirrors these exact numbers in
// src/lib/game/catalog.js.

export interface BusinessUnit {
  tier: number;
  baseCost: number;
  costGrowth: number;
  incomePerMin: number;
  perRound: number;
}

export const BUSINESS_UNITS: BusinessUnit[] = [
  { tier: 0, baseCost: 300,    costGrowth: 1.50, incomePerMin: 2,  perRound: 3 },
  { tier: 1, baseCost: 1500,   costGrowth: 1.55, incomePerMin: 6,  perRound: 8 },
  { tier: 3, baseCost: 8000,   costGrowth: 1.60, incomePerMin: 16, perRound: 20 },
  { tier: 5, baseCost: 40000,  costGrowth: 1.65, incomePerMin: 40, perRound: 50 },
  { tier: 6, baseCost: 180000, costGrowth: 1.70, incomePerMin: 90, perRound: 120 },
];

// Per-collection ceiling = this fraction of the fleet's invested value (the
// same businessNetValue the Empire Value leaderboard ranks). One number drives
// both: buying a business visibly raises your board standing AND your MAX.
export const IDLE_CAP_PCT = 0.10;

// Offline accrual is capped so an idle player can't stockpile unbounded income.
export const MAX_IDLE_MINUTES = 4 * 60;

// Per-collection idle ceiling scales with the vendor's HIGHEST business rank.
export const IDLE_CAPS = [2000, 3500, 6500, 12000, 24000];

export function idleCapForTier(businessTier: number): number {
  const i = Math.min(Math.max(Number(businessTier) || 0, 0), IDLE_CAPS.length - 1);
  return IDLE_CAPS[i];
}

export function getUnit(tier: number): BusinessUnit | undefined {
  return BUSINESS_UNITS.find((b) => b.tier === tier);
}

// Per-collection ceiling = IDLE_CAP_PCT of the fleet's invested value (the
// exact businessNetValue the Empire Value board ranks) — "your stalls hold up
// to 10% of your empire's value". Every purchase raises the ceiling in direct
// proportion to what it cost, so board rank and storage grow together. The old
// tier cap survives as a floor via max(): new players (one 300-coin Bike would
// otherwise cap at 30) keep the 2,000+ floor, and no existing player's ceiling
// ever decreases (tester grandfathering). The 4h accrual window still applies
// on top — for deep fleets the window, not this cap, is the binding limit.
export function fleetIdleCap(businesses: any[] = [], businessTier: number = 0): number {
  const pctCap = Math.floor(businessNetValue(businesses) * IDLE_CAP_PCT);
  return Math.max(idleCapForTier(businessTier), pctCap);
}

export function businessCost(unit: BusinessUnit, owned: number): number {
  return Math.floor(unit.baseCost * Math.pow(unit.costGrowth, owned));
}

export function incomePerMin(businesses: any[] = []): number {
  let total = 0;
  for (const b of businesses) {
    const u = getUnit(b.tier);
    if (u) total += u.incomePerMin * (b.count || 0);
  }
  return total;
}

// Empire value for the 'biz_value' leaderboard: total invested purchase cost
// of the owned fleet (sum of the escalating price paid for each copy). Monotonic
// while businesses can't be sold, deterministic from the businesses jsonb.
export function businessNetValue(businesses: any[] = []): number {
  let total = 0;
  for (const b of businesses) {
    const u = getUnit(b?.tier);
    if (!u) continue;
    const count = Math.max(0, Math.floor(b.count || 0));
    for (let k = 0; k < count; k++) total += Math.floor(u.baseCost * Math.pow(u.costGrowth, k));
  }
  return total;
}

export function perRoundBonus(businesses: any[] = []): number {
  let total = 0;
  for (const b of businesses) {
    const u = getUnit(b.tier);
    if (u) total += u.perRound * (b.count || 0);
  }
  return total;
}

export function collectableCoins(businesses: any[], lastCollectIso: string, businessTier: number = 0): number {
  if (!lastCollectIso) return 0;
  const last = Date.parse(lastCollectIso);
  if (Number.isNaN(last)) return 0;
  if (!businesses || businesses.length === 0) return 0;
  const elapsedMin = Math.max(0, (Date.now() - last) / 60000);
  const effectiveMin = Math.min(elapsedMin, MAX_IDLE_MINUTES);
  const raw = Math.floor(incomePerMin(businesses) * effectiveMin);
  return Math.min(raw, fleetIdleCap(businesses, businessTier));
}
