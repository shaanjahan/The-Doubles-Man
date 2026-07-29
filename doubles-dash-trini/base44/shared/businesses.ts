// Shared idle-business configuration for The Doubles Man. Imported by the
// `manage-business` and `finalize-round` backend functions so the two never
// diverge. Frontend mirrors these exact numbers in src/lib/game/catalog.js.

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

// Offline accrual is capped so an idle player can't stockpile unbounded income.
export const MAX_IDLE_MINUTES = 4 * 60;

// Per-collection idle ceiling scales with the vendor's HIGHEST business rank
// (player.businessTier) — Doubles Bike rank → 2,000, Doubles Stand → 3,500,
// and so on — so the limit grows as the empire ranks up. One cap for the whole
// fleet, not one per business owned. Mirrors src/lib/game/catalog.js.
export const IDLE_CAPS = [2000, 3500, 6500, 12000, 24000];

export function idleCapForTier(businessTier: number): number {
  const i = Math.min(Math.max(Number(businessTier) || 0, 0), IDLE_CAPS.length - 1);
  return IDLE_CAPS[i];
}

export function getUnit(tier: number): BusinessUnit | undefined {
  return BUSINESS_UNITS.find((b) => b.tier === tier);
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

// Idle dollars accrued since lastCollect (bounded by the 8h cap and the
// rank-scaled per-collection ceiling). Business tier beyond the catalog's
// range clamps to the top cap, matching the hub tier display.
export function collectableCoins(businesses: any[], lastCollectIso: string, businessTier: number = 0): number {
  if (!lastCollectIso) return 0;
  const last = Date.parse(lastCollectIso);
  if (Number.isNaN(last)) return 0;
  if (!businesses || businesses.length === 0) return 0;
  const elapsedMin = Math.max(0, (Date.now() - last) / 60000);
  const effectiveMin = Math.min(elapsedMin, MAX_IDLE_MINUTES);
  const raw = Math.floor(incomePerMin(businesses) * effectiveMin);
  return Math.min(raw, idleCapForTier(businessTier));
}