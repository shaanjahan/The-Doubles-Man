// Player session hook for The Doubles Man.
// Loads (and auto-creates) the active user's Player record, keeps an in-memory
// copy in sync, and persists mutations to the Base44 entity automatically.

import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ACHIEVEMENTS, BUSINESS_TIERS, DAILY_MISSION_POOL, WEEKLY_MISSION_POOL,
  MONTHLY_MISSION_POOL, DAILY_REWARDS, MAGIC_SAUCES, xpForLevel, tierForXp,
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
      const list = await withRetry(() => base44.entities.Player.list('-created_date', 5));
      let p = list && list[0];
      if (!p) {
        p = await base44.entities.Player.create({
          displayName: 'New Vendor',
          avatarEmoji: AVATARS[0],
          needsSetup: true,
          level: 1, xp: 0, coins: 250, gems: 10,
          businessTier: 0, currentLocationId: 0,
          dailyStreak: 0, lastDailyClaim: '',
          magicSauces: [
            { id: 'pepper_fairy', count: 2 },
            { id: 'lucky_sauce', count: 2 },
          ],
          equippedSauces: [],
          upgrades: {},
          achievementProgress: {},
          dailyMissions: defaultMissions(DAILY_MISSION_POOL, 3),
          weeklyMissions: defaultMissions(WEEKLY_MISSION_POOL, 2),
          monthlyMissions: defaultMissions(MONTHLY_MISSION_POOL, 1),
          stats: freshStats(),
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      }
      p = ensureDefaults(p);
      p.lastLoginAt = new Date().toISOString();
      playerRef.current = p;
      setPlayer(p);
      // fire-and-forget login touch
      base44.entities.Player.update(p.id, { lastLoginAt: p.lastLoginAt }).catch(() => {});
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

  function uniqueSauceCount(p) {
    return (p.magicSauces || []).filter(s => s.count > 0).length;
  }

  // evaluate achievements vs current stats — return list of newly unlocked with rewards
  function evaluateAchievements(next) {
    const stats = next.stats;
    const snapshot = {
      customersServed: stats.customersServed || 0,
      perfectOrders: stats.perfectOrders || 0,
      highestCombo: stats.highestCombo || 0,
      level: next.level,
      lifetimeCoins: stats.lifetimeCoins || 0,
      uniqueSauces: uniqueSauceCount(next),
      dailyStreak: next.dailyStreak || 0,
      roundsPlayed: stats.roundsPlayed || 0,
    };
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      const cur = next.achievementProgress[a.id] || { value: 0, claimed: false };
      const v = snapshot[a.stat] ?? 0;
      if (!cur.claimed && v >= a.target) {
        next.achievementProgress[a.id] = { value: v, claimed: true, claimedAt: new Date().toISOString() };
        if (a.reward?.coins) next.coins += a.reward.coins;
        if (a.reward?.gems) next.gems += a.reward.gems;
        newly.push(a);
      } else if (cur.value !== v) {
        next.achievementProgress[a.id] = { ...cur, value: v };
      }
    }
    return newly;
  }

  function bumpMissions(next, statMap) {
    for (const list of [next.dailyMissions, next.weeklyMissions, next.monthlyMissions]) {
      if (!list) continue;
      for (const m of list) {
        if (m.claimed) continue;
        if (statMap[m.stat] !== undefined) {
          m.value = Math.max(m.value, statMap[m.stat]);
          if (m.value >= m.target) {
            m.claimed = true;
            if (m.reward?.coins) next.coins += m.reward.coins;
            if (m.reward?.gems) next.gems += m.reward.gems;
            if (m.reward?.xp) next.xp += m.reward.xp;
          }
        }
      }
    }
  }

  // Apply XP / level-up / tier-up after stat changes
  function applyXpCoins(next) {
    while (next.xp >= xpForLevel(next.level)) {
      next.xp -= xpForLevel(next.level);
      next.level += 1;
      next.coins += 100 + next.level * 25;
      // Match the server's finalize-round reward: a few gems per level so the
      // gem balance also climbs as the vendor ranks up (not just coins).
      next.gems = (next.gems || 0) + Math.max(1, Math.floor(next.level / 5));
    }
    const lvlReqs = [1, 3, 6, 10, 15, 22, 30];
    let newTier = 0;
    for (let i = 0; i < lvlReqs.length; i++) if (next.level >= lvlReqs[i]) newTier = i;
    if (newTier > next.businessTier) next.businessTier = newTier;
  }

  // Convenience: also expose recently unlocked achievements (last save)
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);

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
      });
      const data = res?.data;
      if (data?.player) {
        const next = ensureDefaults(data.player);
        playerRef.current = next;
        setPlayer(next);
        // Mission/achievement grants are fixed catalog values; evaluate them on
        // top of the authoritative state and persist once.
        let unlocked = [];
        mutate((p) => {
          const s = p.stats;
          bumpMissions(p, {
            servedToday: s.servedToday,
            perfectToday: s.perfectToday,
            maxComboToday: s.maxComboToday,
            coinsToday: s.coinsToday,
            roundsToday: s.roundsToday,
            sauceUsedToday: s.sauceUsedToday,
            servedWeek: s.servedWeek,
            perfectWeek: s.perfectWeek,
            maxComboWeek: s.maxComboWeek,
            servedMonth: s.servedMonth,
          });
          unlocked = evaluateAchievements(p);
        });
        if (unlocked.length) setNewlyUnlocked(unlocked);
        return data.outcome || null;
      }
      return data?.outcome || null;
    } catch (e) {
      console.error('finalizeRound backend failed:', e);
      return null;
    }
  }, [mutate]);

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

  // Daily login claim — advance streak, grant reward, ensure missions reset for new day.
  const claimDaily = useCallback(() => {
    let granted = null;
    mutate((p) => {
      const today = todayStr();
      if (p.lastDailyClaim === today) return;
      // streak rollover
      let streak = p.dailyStreak;
      if (p.lastDailyClaim) {
        const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (p.lastDailyClaim !== y) streak = 0; // gap -> reset
      } else {
        streak = 0;
      }
      streak += 1;
      const idx = Math.min(streak, DAILY_REWARDS.length) - 1;
      const reward = DAILY_REWARDS[idx] || DAILY_REWARDS[0];
      if (reward.coins) p.coins += reward.coins;
      if (reward.gems) p.gems += reward.gems;
      if (reward.xp) { p.xp += reward.xp; applyXpCoins(p); }
      if (reward.magicSauce) {
        addSauceToInventory(p, reward.magicSauce);
      }
      p.dailyStreak = streak;
      p.lastDailyClaim = today;
      // reset today's missions if day changed
      if (p.stats.lastDayReset !== today) {
        p.stats.lastDayReset = today;
        p.stats.servedToday = 0; p.stats.perfectToday = 0; p.stats.maxComboToday = 0;
        p.stats.coinsToday = 0; p.stats.roundsToday = 0; p.stats.sauceUsedToday = 0;
        p.dailyMissions = defaultMissions(DAILY_MISSION_POOL, 3);
      }
      granted = { streak, reward };
      evaluateAchievements(p);
    });
    return granted;
  }, [mutate]);

  // Buy an upgrade (cost in coins)
  const buyUpgrade = useCallback((upgrade) => {
    let ok = false;
    mutate((p) => {
      const lvl = p.upgrades[upgrade.id] || 0;
      if (lvl >= upgrade.maxLevel) return;
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, lvl));
      if (p.coins < cost) return;
      p.coins -= cost;
      p.upgrades[upgrade.id] = lvl + 1;
      ok = true;
    });
    return ok;
  }, [mutate]);

  // Equip a magic sauce (up to 2). If already equipped, unequip.
  const toggleEquipSauce = useCallback((sauceId) => {
    mutate((p) => {
      const idx = p.equippedSauces.indexOf(sauceId);
      if (idx >= 0) {
        p.equippedSauces.splice(idx, 1);
      } else if (p.equippedSauces.length < 2) {
        p.equippedSauces.push(sauceId);
      } else {
        p.equippedSauces[1] = sauceId; // replace second slot
      }
    });
  }, [mutate]);

  // Add a sauce to inventory (by id)
  function addSauceToInventory(p, sauceId, count = 1) {
    const slot = (p.magicSauces || []).find(s => s.id === sauceId);
    if (slot) slot.count += count;
    else p.magicSauces.push({ id: sauceId, count });
  }

  // Open a mystery sauce pack (spend gems)
  const openSaucePack = useCallback((costGems) => {
    let granted = [];
    mutate((p) => {
      if (p.gems < costGems) return;
      p.gems -= costGems;
      for (let i = 0; i < 3; i++) {
        const id = randomSauceIdLite();
        addSauceToInventory(p, id);
        granted.push(id);
      }
      evaluateAchievements(p);
    });
    return granted;
  }, [mutate]);

  const buySauceWithCoins = useCallback((sauceId) => {
    let ok = false;
    mutate((p) => {
      addSauceToInventory(p, sauceId);
      ok = true;
      evaluateAchievements(p);
    });
    return ok;
  }, [mutate]);

  // Simulate an in-app purchase (no real IAP on web preview — grant immediately)
  const grantIAP = useCallback((product) => {
    mutate((p) => {
      if (product.bundle) {
        if (product.bundle.coins) p.coins += product.bundle.coins;
        if (product.bundle.gems) p.gems += product.bundle.gems;
        if (product.bundle.magicSauce) addSauceToInventory(p, product.bundle.magicSauce);
      } else if (product.kind === 'coin_pack') {
        p.coins += product.amount + (product.bonus || 0);
      } else if (product.kind === 'gem_pack') {
        p.gems += product.amount + (product.bonus || 0);
      } else if (product.kind === 'sauce_pack') {
        for (let i = 0; i < product.amount; i++) addSauceToInventory(p, randomSauceIdLite());
      }
      evaluateAchievements(p);
    });
  }, [mutate]);

  // Count a friend invite (triggered by sharing the game) and progress the
  // "Invite 2 friends" weekly mission.
  const trackInvite = useCallback(() => {
    mutate((p) => {
      p.stats = p.stats || {};
      p.stats.invitedFriends = (p.stats.invitedFriends || 0) + 1;
      bumpMissions(p, { invitedFriends: p.stats.invitedFriends });
      evaluateAchievements(p);
    });
  }, [mutate]);

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);
  const setAvatar = useCallback((emoji) => {
    mutate((p) => { p.avatarEmoji = emoji; });
  }, [mutate]);

  // One-time "how to play" walkthrough. Recording completion rather than
  // mere dismissal so a user who taps Skip still doesn't see it again — the
  // tutorial is for first-timers only.
  const completeTutorial = useCallback(() => {
    mutate((p) => { p.hasSeenTutorial = true; });
  }, [mutate]);

  const completeSetup = useCallback((name, gender) => {
    const url = characterUrlByGender(gender);
    return mutate((p) => {
      p.displayName = name;
      p.avatarEmoji = url;
      p.needsSetup = false;
    });
  }, [mutate]);

  return {
    loading, error, player,
    reload, mutate, persist, applyServerPlayer,
    finalizeRound, manageBusiness, claimDaily, buyUpgrade,
    toggleEquipSauce, openSaucePack, buySauceWithCoins,
    grantIAP, setAvatar, completeSetup, completeTutorial, trackInvite,
    newlyUnlocked, clearNewlyUnlocked,
  };
}

function randomSauceIdLite() {
  const r = Math.random();
  let bucket;
  if (r < 0.05) bucket = 'Legendary';
  else if (r < 0.2) bucket = 'Epic';
  else if (r < 0.45) bucket = 'Rare';
  else bucket = 'Common';
  const pool = MAGIC_SAUCES.filter(s => s.rarity === bucket);
  return (pool[Math.floor(Math.random() * pool.length)] || MAGIC_SAUCES[0]).id;
}