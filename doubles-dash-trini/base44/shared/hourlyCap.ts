// Hourly earning cap: limits how many dollars (coins) a player can earn from
// gameplay rounds within a rolling 60-minute window, slowing bot/farm abuse.
// A qualifying store purchase (>= HOURLY_CAP_PURCHASE_THRESHOLD USD) raises
// the player's permanent cap via boostHourlyCap.

export const HOURLY_CAP_BASE = 3500;
export const HOURLY_CAP_BOOST = 3500;
export const HOURLY_CAP_PURCHASE_THRESHOLD = 10; // USD major units
const HOUR_MS = 60 * 60 * 1000;

export function getHourlyCap(player: any): number {
  const cap = Number(player?.hourlyEarningsCap);
  return Number.isFinite(cap) && cap > 0 ? cap : HOURLY_CAP_BASE;
}

// Prune the rolling log to the last hour, then clamp `coinsEarned` to the
// remaining headroom. Mutates player.earningsLog. Returns award details.
export function applyHourlyCap(player: any, coinsEarned: number, now: number = Date.now()) {
  const cap = getHourlyCap(player);
  const log: any[] = Array.isArray(player.earningsLog) ? player.earningsLog : [];
  const cutoff = now - HOUR_MS;
  const kept = log.filter((e) => {
    const t = new Date(e?.t).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  const used = kept.reduce((a, e) => a + (Number(e?.coins) || 0), 0);
  const remaining = Math.max(0, cap - used);
  const allowed = Math.max(0, Math.min(coinsEarned, remaining));
  if (allowed > 0) {
    kept.push({ t: new Date(now).toISOString(), coins: allowed });
  }
  player.earningsLog = kept;
  return { allowed, cap, limited: allowed < coinsEarned, remaining: Math.max(0, cap - used - allowed) };
}

// Raise the permanent hourly cap and grant immediate fresh headroom by
// clearing the rolling window so the purchase is felt right away.
export function boostHourlyCap(player: any) {
  player.hourlyEarningsCap = getHourlyCap(player) + HOURLY_CAP_BOOST;
  player.earningsLog = [];
}