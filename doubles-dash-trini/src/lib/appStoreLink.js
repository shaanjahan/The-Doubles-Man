// Smart App Store handoff shared by /app (auto) and /get (button).
//
// In-app browsers (Instagram/TikTok/Facebook) sandbox normal web navigation:
// apps.apple.com renders as a webpage whose Get button is dead, and server 302s
// land in the same sandbox. What they DO pass through to iOS is Apple's own
// itms-appss:// scheme — WKWebView hands unknown schemes to the OS, which
// launches the real App Store app. That's the "one-tap open" every link-in-bio
// service uses. The https listing stays as a timed fallback for anything that
// blocks the scheme.

import { supabase } from '@/api/base44Client';

export const APP_STORE_HTTPS = 'https://apps.apple.com/app/the-doubles-man/id6794140621';
const APP_STORE_ITMS = 'itms-appss://apps.apple.com/app/the-doubles-man/id6794140621';

export function detectPlatform() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

// Fire-and-forget attribution — never blocks or delays the redirect.
export function trackLinkHit(src, platform) {
  try {
    supabase.functions.invoke('track-link', { body: { src, platform } }).catch(() => {});
  } catch { /* tracking is best-effort */ }
}

// iOS one-tap open: itms scheme first, https listing as fallback if the
// scheme was blocked (page still visible after the attempt).
export function openAppStore() {
  window.location.href = APP_STORE_ITMS;
  setTimeout(() => {
    if (!document.hidden) window.location.href = APP_STORE_HTTPS;
  }, 1400);
}
