// Player session hook for The Doubles Man.
// Loads (and auto-creates) the active user's Player record, keeps an in-memory
// copy in sync, and persists mutations to the Base44 entity automatically.

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44, supabase } from '@/api/base44Client';
import {
  ACHIEVEMENTS, LOCATIONS, DAILY_MISSION_POOL, WEEKLY_MISSION_POOL, MONTHLY_MISSION_POOL,
} from './catalog';
import { characterUrlByGender } from './characters';

const AVATARS = ['🧑‍🍳', '👨‍🍳', '👩‍🍳', '👳‍♂️', '🧕', '🫅'];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function startOfDayKey(periodKey) { return periodKey; }

// Built-in fields the server owns and rejects on update — strip them from
// every client-side patch so updates actually persist (otherwise needsSetup,
// coins, upgrades, daily streak, etc. silently never reach the DB).
const BUILTIN_KEYS = new Set(['id', 'created_date', 'updated_date', 'created_by_id']);
function sanitizePatch(p) {
  const out = {};
  for (const k in p) {
    if (BUILTIN_KEYS.has(k)) continue;
    out[k] = p[k];
  }
  return out;
}

// Bounded retry for the boot-time Player fetch. Right after an Apple/Google
// OAuth return the WebView's session can briefly fail its first entity call;
// without retries the player stays null and the hub never renders (perpetual
// spinner). A few attempts with short backoff clears that blip so the hub
// loads instead of stranding the freshly-signed-in user.
async function withRetry(fn, attempts = 3, delayMs = 900) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs * (i + 1))); }
  }
  throw lastErr;
}

function defaultMissions(pool, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = pool[i % pool.length];
    return { id: t.id, desc: t.desc, target: t.target, stat: t.stat, reward: t.reward, value: 0, claimed: false };
  });
}

function freshStats() {
  return {
    customersServed: 0, perfectOrders: 0, highestCombo: 0, lifetimeCoins: 0,
    roundsPlayed: 0, mistakes: 0, favoredSauce: '',
    servedToday: 0, perfectToday: 0, maxComboToday: 0, coinsToday: 0,
    roundsToday: 0, sauceUsedToday: 0,
    servedWeek: 0, perfectWeek: 0, maxComboWeek: 0,
    servedMonth: 0, invitedFriends: 0, lastDayReset: todayStr(),
  };
}

function ensureDefaults(p) {
  p.avatarEmoji = p.avatarEmoji ?? AVATARS[0];
  p.level = p.level ?? 1;
  p.xp = p.xp ?? 0;
  p.coins = p.coins ?? 250;
  p.gems = p.gems ?? 10;
  p.businessTier = p.businessTier ?? 0;
  p.currentLocationId = p.currentLocationId ?? 0;
  p.dailyStreak = p.dailyStreak ?? 0;
  p.lastDailyClaim = p.lastDailyClaim ?? '';
  p.needsSetup = p.needsSetup ?? false;
  p.hasSeenTutorial = p.hasSeenTutorial ?? false;
  p.magicSauces = p.magicSauces ?? [];
  p.equippedSauces = p.equippedSauces ?? [];
  p.upgrades = p.upgrades ?? {};
  p.businesses = Array.isArray(p.businesses) ? p.businesses : [];
  p.lastBusinessCollect = p.lastBusinessCollect || new Date().toISOString();
  p.hourlyEarningsCap = p.hourlyEarningsCap ?? 3500;
  p.earningsLog = Array.isArray(p.earningsLog) ? p.earningsLog : [];
  p.achievementProgress = p.achievementProgress ?? {};
  p.dailyMissions = (p.dailyMissions && p.dailyMissions.length) ? p.dailyMissions : defaultMissions(DAILY_MISSION_POOL, 3);
  p.weeklyMissions = (p.weeklyMissions && p.weeklyMissions.length) ? p.weeklyMissions : defaultMissions(WEEKLY_MISSION_POOL, 2);
  // Migrate the retired "40 perfect orders this week" mission to "Invite 2
  // friends" for existing players — weekly missions are seeded once at signup
  // and never re-seed, so swap the old entry in place by id.
  if (Array.isArray(p.weeklyMissions) && p.weeklyMissions.some((m) => m.id === 'wm_perfect_40')) {
    p.weeklyMissions = p.weeklyMissions.map((m) =>
      m.id === 'wm_perfect_40'
        ? { id: 'wm_invite_2', desc: 'Invite 2 friends', target: 2, stat: 'invitedFriends', reward: { gems: 15 }, value: Math.min(2, (p.stats && p.stats.invitedFriends) || 0), claimed: false }
        : m
    );
  }
  p.monthlyMissions = (p.monthlyMissions && p.monthlyMissions.length) ? p.monthlyMissions : defaultMissions(MONTHLY_MISSION_POOL, 1);
  p.stats = { ...freshStats(), ...(p.stats || {}) };
  return p;
}

export function usePlayer() {
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure the session has actually settled before issuing any entity
      // call. Right after an Apple/Google OAuth redirect, base44.auth.me()
      // can briefly resolve to nothing, and a Player.list fired in that gap
      // 401s — stranding the freshly-signed-in user on the hub spinner. Retry
      // me() first and only fetch the player record once a user is confirmed.
      let me = null;
      try { me = await withRetry(() => base44.auth.me(), 3, 700); } catch { me = null; }
      if (!me) throw new Error('auth_not_ready');
      // ensure-player atomically creates the row server-side if missing (the
      // only path a players row is created through) and returns the
      // authoritative player — camelCase + nested stats.
      const res = await withRetry(() => base44.functions.invoke('ensure-player', {}));
      const p = res?.data?.player;
      if (!p) throw new Error('no_player');
      const next = ensureDefaults(p);
      playerRef.current = next;
      setPlayer(next);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Crash salvage: if the previous session was killed mid-round (a render
  // crash, the OS reaping the WebView, or power loss), a "pending round"
  // snapshot remains in localStorage. On launch, finalize it against the
  // server so the player still receives the coins / gems / XP they earned
  // instead of losing the whole run. The snapshot is removed BEFORE
  // finalizing so a second crash can't double-grant the same round.
  useEffect(() => {
    if (!player) return;
    let raw;
    try { raw = localStorage.getItem('doubles_pendingRound'); } catch { return; }
    if (!raw) return;
    try { localStorage.removeItem('doubles_pendingRound'); } catch {}
    let pending;
    try { pending = JSON.parse(raw); } catch { return; }
    const gains = (pending.coinsEarned || 0) + (pending.gemsEarned || 0) + (pending.xpEarned || 0);
    if (gains <= 0 && !(pending.servedCount || 0)) return;
    base44.functions.invoke('finalize-round', {
      locationId: Number(pending.locationId) || 0,
      servedCount: pending.servedCount || 0,
      perfectCount: pending.perfectCount || 0,
      mistakes: pending.mistakes || 0,
      maxCombo: pending.maxCombo || 0,
      coinsEarned: pending.coinsEarned || 0,
      gemsEarned: pending.gemsEarned || 0,
      xpEarned: pending.xpEarned || 0,
      elapsedMs: pending.elapsedMs || 60000,
      // A crashed Today's Rush still consumed the attempt — salvage it too.
      challenge: !!pending.challenge,
      // Lets the server replay-guard no-op this if the round already landed.
      sessionId: pending.sessionId || '',
    }).then((res) => {
      const p = res?.data?.player;
      if (p) { playerRef.current = ensureDefaults(p); setPlayer(playerRef.current); }
    }).catch((e) => console.error('Crash-salvage finalize failed:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  const persist = useCallback((next) => {
    playerRef.current = next;
    setPlayer(next);
    base44.entities.Player.update(next.id, sanitizePatch(next)).catch((e) => {
      console.error('Player persist failed:', e);
    });
  }, []);

  // Adopt the authoritative player object returned by a backend function
  // (apple-iap-verify, finalize-round, manage-business) without re-fetching.
  const applyServerPlayer = useCallback((p) => {
    if (!p) return null;
    const next = ensureDefaults(p);
    // Rank-up location unlocks: compare against the previous in-memory player
    // (never fires on first load — prev is null then) and surface any location
    // whose tier gate was just crossed for the unlock toast.
    const prev = playerRef.current;
    if (
      prev && typeof prev.businessTier === 'number' &&
      typeof next.businessTier === 'number' && next.businessTier > prev.businessTier
    ) {
      const newly = LOCATIONS.filter(
        (l) => (l.unlockTier || 0) > prev.businessTier && (l.unlockTier || 0) <= next.businessTier
      );
      if (newly.length) setUnlockedLocations(newly);
    }
    playerRef.current = next;
    setPlayer(next);
    return next;
  }, []);

  // mutate takes a function that mutates a draft clone of the player.
  // It persists to the cloud automatically and returns the new player object.
  const mutate = useCallback((mutator) => {
    const curr = playerRef.current;
    if (!curr) return curr;
    const next = { ...curr };
    mutator(next);
    persist(next);
    return next;
  }, [persist]);

  // Achievement/mission/level-up computation moved server-side (finalize-round,
  // claim-daily, etc.); the client-side helpers were removed with the economy
  // rewiring. usePlayer now adopts the authoritative player the Edge Functions
  // return (applyServerPlayer) and surfaces newAchievements for the toast.

  // Convenience: also expose recently unlocked achievements (last save)
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const [unlockedLocations, setUnlockedLocations] = useState([]);

  // finalizeRound(outcome) — send the round's verifiable counters to the
  // `finalize-round` backend function, which clamps currency/XP to a
  // server-computed ceiling and applies them authoritatively. Only the
  // counters are trusted; reward amounts are never applied from the client.
  const finalizeRound = useCallback(async (outcome) => {
    if (!playerRef.current || !outcome) return null;
    try {
      const res = await base44.functions.invoke('finalize-round', {
        locationId: Number(outcome.locationId) || 0,
        servedCount: outcome.servedCount || 0,
        perfectCount: outcome.perfectCount || 0,
        mistakes: outcome.mistakes || 0,
        maxCombo: outcome.maxCombo || 0,
        coinsEarned: outcome.coinsEarned || 0,
        gemsEarned: outcome.gemsEarned || 0,
        xpEarned: outcome.xpEarned || 0,
        sauceUsed: !!outcome.sauceUsed,
        elapsedMs: outcome.elapsedMs || 60000,
        sessionId: outcome.sessionId || '',
        challenge: !!outcome.challenge,
      });
      const data = res?.data;
      if (data?.player) {
        // Through applyServerPlayer so rank-ups fire the location-unlock
        // toast — rounds are the main path a tier ever increases on.
        applyServerPlayer(data.player);
        // Missions AND achievements are now granted SERVER-SIDE by finalize-round
        // (the response player already reflects mission/achievement rewards and
        // the bumped/reset mission lists). Do NOT bump or evaluate them here too,
        // or they'd double-grant. Just surface the newly-unlocked achievements
        // from the response for the toast. (The invitedFriends weekly mission is
        // still bumped in trackInvite — its own pending server port.)
        const unlocked = (data.newAchievements || [])
          .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
          .filter(Boolean);
        if (unlocked.length) setNewlyUnlocked(unlocked);
        return data.outcome || null;
      }
      return data?.outcome || null;
    } catch (e) {
      console.error('finalizeRound backend failed:', e);
      return null;
    }
  }, [applyServerPlayer]);

  // My Business: collect idle earnings or buy a new business unit. Authoritative —
  // the server checks unlock tier, cost, and real-time accrual before mutating.
  const manageBusiness = useCallback(async (action, tier) => {
    if (!playerRef.current) return null;
    try {
      const res = await base44.functions.invoke('manage-business', { action, tier });
      const next = res?.data?.player ? ensureDefaults(res.data.player) : null;
      if (next) { playerRef.current = next; setPlayer(next); }
      return res?.data || null;
    } catch (e) {
      console.error('manageBusiness failed:', e);
      return null;
    }
  }, []);

  // Daily login claim — server-authoritative (claim-daily). Returns
  // { streak, reward } for the modal, or null if already claimed today.
  const claimDaily = useCallback(async (opts = {}) => {
    try {
      // opts.repair spends STREAK_REPAIR_COST gems to bridge exactly one
      // missed day (claim-daily re-validates the gap, streak and balance).
      const res = await base44.functions.invoke('claim-daily', { repair: opts.repair === true });
      const data = res?.data;
      if (data?.player) applyServerPlayer(data.player);
      if (data?.newAchievements?.length) {
        setNewlyUnlocked(data.newAchievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean));
      }
      return (data?.reward != null)
        ? { streak: data.streak, reward: data.reward, repaired: data.repaired === true }
        : null;
    } catch (e) {
      // Expected 409s ("Already claimed today" / repair_unavailable /
      // not_enough_gems) surface via error so the modal can react.
      console.error('claimDaily failed:', e);
      return { error: e?.message || 'claim_failed' };
    }
  }, [applyServerPlayer]);

  // Buy an upgrade — server-authoritative (buy-upgrade). Returns true on success,
  // false on any rejection (max level / not enough dollars / unknown upgrade).
  const buyUpgrade = useCallback(async (upgrade) => {
    try {
      const res = await base44.functions.invoke('buy-upgrade', { upgradeId: upgrade.id });
      if (res?.data?.player) { applyServerPlayer(res.data.player); return true; }
      return false;
    } catch {
      return false;
    }
  }, [applyServerPlayer]);

  // Equip / unequip a magic sauce — server-authoritative (equip-sauce, which
  // enforces ownership so the finalize-round ceiling can't be inflated).
  const toggleEquipSauce = useCallback(async (sauceId) => {
    try {
      const res = await base44.functions.invoke('equip-sauce', { sauceId });
      if (res?.data?.player) applyServerPlayer(res.data.player);
    } catch (e) {
      console.error('toggleEquipSauce failed:', e);
    }
  }, [applyServerPlayer]);

  // Add a sauce to inventory (by id)
  // Open a mystery sauce pack — server-authoritative (open-sauce-pack). The gem
  // cost and 3-sauce roll are server-side; any passed cost arg is ignored.
  // Returns the granted sauce ids (or [] on failure / not enough gems).
  const openSaucePack = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('open-sauce-pack', {});
      const data = res?.data;
      if (data?.player) applyServerPlayer(data.player);
      if (data?.newAchievements?.length) {
        setNewlyUnlocked(data.newAchievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean));
      }
      return data?.granted || [];
    } catch (e) {
      console.error('openSaucePack failed:', e);
      return [];
    }
  }, [applyServerPlayer]);

  // Bara Stock purchases (start-round): pre-round crates ('start') or a
  // mid-round restock ('restock'). Server-priced and atomic; returns the new
  // wallet + allowance, or null on failure (caller keeps the round running
  // on whatever stock remains).
  const buyRoundStock = useCallback(async (action, sessionId, crates = 0) => {
    try {
      const res = await base44.functions.invoke('start-round', { action, sessionId, crates });
      const data = res?.data;
      if (!data || data.error) return null;
      if (typeof data.coins === 'number' && playerRef.current) {
        // Local-only sync: the server already debited the wallet; coins is
        // not a client-writable column, so no persist call here.
        const next = { ...playerRef.current, coins: data.coins };
        playerRef.current = next;
        setPlayer(next);
      }
      return data;
    } catch (e) {
      console.error('buyRoundStock failed:', e);
      return null;
    }
  }, []);

  // Direct purchase of one specific sauce for gems (buy-sauce): the server
  // prices it by rarity and ignores any client-supplied cost.
  const buySauce = useCallback(async (sauceId) => {
    try {
      const res = await base44.functions.invoke('buy-sauce', { sauceId });
      const data = res?.data;
      if (data?.player) applyServerPlayer(data.player);
      if (data?.newAchievements?.length) {
        setNewlyUnlocked(data.newAchievements.map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter(Boolean));
      }
      return !data?.error;
    } catch (e) {
      console.error('buySauce failed:', e);
      return false;
    }
  }, [applyServerPlayer]);

  // Count a friend invite — server-authoritative (track-invite): bumps
  // invited_friends + the "Invite 2 friends" weekly mission.
  const trackInvite = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('track-invite', {});
      if (res?.data?.player) applyServerPlayer(res.data.player);
    } catch (e) {
      console.error('trackInvite failed:', e);
    }
  }, [applyServerPlayer]);

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);
  const clearUnlockedLocations = useCallback(() => setUnlockedLocations([]), []);
  const setAvatar = useCallback((emoji) => {
    mutate((p) => { p.avatarEmoji = emoji; });
  }, [mutate]);

  // One-time "how to play" walkthrough. Recording completion rather than
  // mere dismissal so a user who taps Skip still doesn't see it again — the
  // tutorial is for first-timers only.
  const completeTutorial = useCallback(() => {
    mutate((p) => { p.hasSeenTutorial = true; });
  }, [mutate]);

  // Vendor names are unique game-wide (case-insensitive, DB-enforced).
  // Returns false when the name is taken so the setup screen can ask for
  // another. The RPC check is the friendly layer; the unique index settles
  // any race. Fails open on network errors — the index is the backstop.
  const completeSetup = useCallback(async (name, gender) => {
    try {
      const { data: available, error } = await supabase.rpc('display_name_available', { p_name: name });
      if (!error && available === false) return false;
    } catch { /* fail open — the unique index still protects */ }
    const url = characterUrlByGender(gender);
    mutate((p) => {
      p.displayName = name;
      p.avatarEmoji = url;
      p.needsSetup = false;
    });
    return true;
  }, [mutate]);

  return {
    loading, error, player,
    reload, mutate, persist, applyServerPlayer,
    finalizeRound, manageBusiness, claimDaily, buyUpgrade,
    toggleEquipSauce, openSaucePack, buySauce, buyRoundStock,
    setAvatar, completeSetup, completeTutorial, trackInvite,
    newlyUnlocked, clearNewlyUnlocked,
    unlockedLocations, clearUnlockedLocations,
  };
}

