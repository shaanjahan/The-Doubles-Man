import { useCallback, useEffect, useState } from 'react';
import { LOCATIONS } from './catalog';

// Shared "where yuh selling" preference for the Hub chip and the Play page.
//
// players.current_location_id is server-owned (not in the authenticated UPDATE
// column grant), so a client can't persist the choice there — it stayed 0 for
// everyone, which is why the Hub always read "San Fernando" while Play used its
// own local state. The pick now lives in localStorage, falls back to the server
// value, and is broadcast so every mounted consumer agrees instantly.
//
// Always clamped to a location the player has actually unlocked; finalize-round
// independently rejects locked locations (403), so this is UI hygiene, not the
// security boundary.

const KEY = 'doubles_selling_location';
export const SELLING_LOCATION_EVENT = 'selling-location-changed';
const EVENT = SELLING_LOCATION_EVENT;

export function readStoredLocation() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function isLocationUnlocked(id, businessTier = 0) {
  const l = LOCATIONS.find((x) => x.id === Number(id));
  return !!l && (l.unlockTier || 0) <= businessTier;
}

export function useSellingLocation(player) {
  const tier = player?.businessTier || 0;

  const [locId, setLocIdState] = useState(() => {
    const initial = readStoredLocation() ?? player?.currentLocationId ?? 0;
    return isLocationUnlocked(initial, tier) ? initial : 0;
  });

  // The player record can arrive (or tier up) after mount — re-clamp then.
  useEffect(() => {
    setLocIdState((cur) => (isLocationUnlocked(cur, tier) ? cur : 0));
  }, [tier]);

  const setLocId = useCallback((id) => {
    const n = Number(id);
    if (!isLocationUnlocked(n, tier)) return;
    setLocIdState(n);
    try { localStorage.setItem(KEY, String(n)); } catch { /* private mode */ }
    try { window.dispatchEvent(new CustomEvent(EVENT, { detail: n })); } catch { /* no-op */ }
  }, [tier]);

  // Keep the Hub chip and the Play page in lockstep while both are mounted.
  useEffect(() => {
    const onChanged = (e) => setLocIdState(Number(e.detail));
    window.addEventListener(EVENT, onChanged);
    return () => window.removeEventListener(EVENT, onChanged);
  }, []);

  return [locId, setLocId];
}
