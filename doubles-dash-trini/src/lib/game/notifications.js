// Comeback reminders via the iOS shell's local-notification bridge
// (window.NativeNotify, NotificationBridge.swift, build 5+). Everything is
// computed HERE from player state and scheduled on-device when the app goes to
// background; nothing is pushed from a server. On foreground all pending +
// delivered notifications are cleared, so reminders never fire mid-session.
// In the browser (no bridge) every function is a silent no-op.

import {
  businessIncomePerMin, collectableCoins, fleetIdleCap, MAX_IDLE_MINUTES,
  trinidadDayStr,
} from './catalog';

const N = () => (typeof window !== 'undefined' ? window.NativeNotify : null);

// Epoch ms for HH:MM Trinidad time on a POS day string ('YYYY-MM-DD').
// America/Port_of_Spain is fixed UTC-4, no DST.
function posTime(dayStr, hour, minute = 0) {
  return Date.parse(`${dayStr}T00:00:00-04:00`) + (hour * 60 + minute) * 60000;
}

// One system permission prompt per session, and only for players engaged
// enough that the reminders mean something (own a business or reached lvl 2).
let requestedThisSession = false;
export async function maybeRequestPermission(player) {
  const api = N();
  if (!api?.available || requestedThisSession || !player) return;
  const engaged = (player.level || 1) >= 2 || (player.businesses || []).length > 0;
  if (!engaged) return;
  requestedThisSession = true;
  try {
    const { status } = await api.status();
    if (status === 'notDetermined') await api.request();
  } catch { /* bridge hiccup — try again next session */ }
}

// Foreground: silence everything (also clears delivered banners + badge).
export async function clearNotifications() {
  try { await N()?.cancelAll(); } catch { /* best-effort */ }
}

// Background: schedule the three comeback hooks from current player state.
export async function syncNotifications(player) {
  const api = N();
  if (!api?.available || !player) return;
  try {
    const { status } = await api.status();
    if (status !== 'authorized' && status !== 'provisional' && status !== 'ephemeral') return;
    await api.cancelAll();

    const now = Date.now();
    const today = trinidadDayStr();

    // 1) Stall full — fires the moment idle income hits the storage cap.
    const businesses = player.businesses || [];
    const perMin = businessIncomePerMin(businesses);
    if (perMin > 0) {
      const cap = fleetIdleCap(businesses, player.businessTier);
      const maxStorable = Math.min(perMin * MAX_IDLE_MINUTES, cap);
      const collectable = collectableCoins(businesses, player.lastBusinessCollect, player.businessTier);
      const minsLeft = (maxStorable - collectable) / perMin;
      if (minsLeft > 3) {
        await api.schedule({
          id: 'stall_full',
          title: 'Yuh stalls FULL!',
          body: `$${Math.floor(maxStorable).toLocaleString()} in doubles money ready to collect.`,
          at: (now + minsLeft * 60000) / 1000,
        });
      }
    }

    // 2) Streak guard — 7 PM Trinidad on the next unclaimed day.
    const streak = player.dailyStreak || 0;
    if (streak >= 1) {
      const claimedToday = (player.lastDailyClaim || '') >= today;
      const day = claimedToday ? trinidadDayStr(1) : today;
      const at = posTime(day, 19);
      if (at > now + 60000) {
        await api.schedule({
          id: 'streak_guard',
          title: `${streak}-day streak on de line!`,
          body: 'Claim yuh daily reward before midnight or de streak gone.',
          at: at / 1000,
        });
      }
    }

    // 3) Today's Rush — 8:30 PM Trinidad, only if today's attempt is unused.
    if ((player.lastChallengeDay || '') < today) {
      const at = posTime(today, 20, 30);
      if (at > now + 60000) {
        await api.schedule({
          id: 'rush_close',
          title: "Today's Rush closes at midnight",
          body: 'One attempt, one board. Take yuh shot before 12!',
          at: at / 1000,
        });
      }
    }
  } catch { /* reminders are best-effort — never block the game */ }
}
