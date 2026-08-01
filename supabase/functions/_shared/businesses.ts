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
  capContribution: number;
}

// capContribution: each owned copy adds this much to the fleet's per-collection
// ceiling (see fleetIdleCap). Sized so a copy's own slice fills in a constant
// time regardless of fleet size (contribution/incomePerMin: Bike ~4h ... Monarch
// ~1.5h) and so marginal top-tier copies pay back in ~1-2 weeks of casual
// collecting — the tier-based cap alone made every copy after the first Monarch
// idle-worthless (one Monarch's 90/min already filled the 24k cap in a 4h window).
export const BUSINESS_UNITS: BusinessUnit[] = [
  { tier: 0, baseCost: 300,    costGrowth: 1.50, incomePerMin: 2,  perRound: 3,   capContribution: 500 },
  { tier: 1, baseCost: 1500,   costGrowth: 1.55, incomePerMin: 6,  perRound: 8,   capContribution: 1000 },
  { tier: 3, baseCost: 8000,   costGrowth: 1.60, incomePerMin: 16, perRound: 20,  capContribution: 2000 },
  { tier: 5, baseCost: 40000,  costGrowth: 1.65, incomePerMin: 40, perRound: 50,  capContribution: 4500 },
  { tier: 6, baseCost: 180000, costGrowth: 1.70, incomePerMin: 90, perRound: 120, capContribution: 8000 },
];

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

// Fleet-scaled per-collection ceiling: every owned copy contributes its slice,
// so buying more businesses ALWAYS raises the ceiling (the old tier-based cap
// saturated at roughly one Monarch). The old tier cap survives as a floor via
// max(): no existing player's ceiling ever decreases (tester grandfathering).
export function fleetIdleCap(businesses: any[] = [], businessTier: number = 0): number {
  let sum = 0;
  for (const b of businesses) {
    const u = getUnit(b?.tier);
    if (u) sum += u.capContribution * (b.count || 0);
  }
  return Math.max(idleCapForTier(businessTier), sum);
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
