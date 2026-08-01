// Supabase-backed drop-in replacement for the Base44 SDK client.
//
// Keeps the exact `base44` export shape the app already uses
// (base44.auth.*, base44.entities.*, base44.functions.invoke) so most call
// sites are unchanged. The genuine differences are:
//   * auth — flow/signature changes (OTP `type`, `setToken` obsolete): a few
//     Login/Register/ResetPassword call sites are adjusted to match.
//   * economy mutations — rewired to functions.invoke in usePlayer.js (they used
//     to raw-write via entities.Player.update).
//   * Player.update — cosmetic columns only (economy columns aren't
//     client-writable under RLS).
//
// Config comes from Vite env (.env.local locally): VITE_SUPABASE_URL +
// VITE_SUPABASE_ANON_KEY (the anon key is public by design).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loud in dev — a missing env var otherwise looks like a silent auth bug.
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');

// ---- auth ----
const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
  },
  async logout(redirect) {
    await supabase.auth.signOut();
    if (redirect && typeof window !== 'undefined') window.location.href = redirect;
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  loginWithProvider(provider, redirectPath) {
    // Native Sign in with Apple (iOS wrapper): the one-tap Face ID sheet via
    // the SIWA bridge, then exchange Apple's identity token directly for a
    // Supabase session — no web OAuth redirect chain (which forced the full
    // appleid.apple.com password + 2FA login inside the WKWebView and was
    // prone to mid-chain races that took multiple attempts).
    if (provider === 'apple' && window.NativeSIWA?.available) {
      return (async () => {
        const { identityToken, nonce } = await window.NativeSIWA.signIn();
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: identityToken,
          nonce,
        });
        if (error) throw error;
        // Session is established synchronously — go straight into the game.
        if (typeof window !== 'undefined') window.location.href = redirectPath || '/home';
        return data;
      })();
    }
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: origin() + (redirectPath || '/home') },
    });
  },
  // type: 'signup' (register confirm), 'email' (login OTP), 'recovery' (reset).
  async verifyOtp({ email, otpCode, type = 'email' }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type });
    if (error) throw error;
    return data; // session is now established (data.session / data.user)
  },
  // type: 'signup' resends the signup confirm code; otherwise sends a login OTP.
  async resendOtp(email, type = 'signup') {
    if (type === 'signup') {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
    }
  },
  // Obsolete under Supabase: verifyOtp/signIn already establish the session.
  // Kept as a no-op so a stray call can't crash; call sites are being removed.
  setToken() { /* no-op */ },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: origin() + '/reset-password',
    });
    if (error) throw error;
  },
  // The recovery link/OTP has established a session by the time this runs.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
  redirectToLogin(redirect) {
    if (typeof window === 'undefined') return;
    const r = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
    window.location.href = `/login${r}`;
  },
};

async function currentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// Only these player columns are client-writable (RLS). Client patches are
// camelCase; map to the snake_case columns and drop everything else (economy
// fields are server-only and would be rejected).
const COSMETIC_MAP = {
  displayName: 'display_name',
  avatarEmoji: 'avatar_emoji',
  needsSetup: 'needs_setup',
  hasSeenTutorial: 'has_seen_tutorial',
};

// snake_case DB row -> camelCase (top-level keys), matching the player contract
// every Edge Function returns. Used for tables read directly from the client
// (leaderboard_entries) rather than through a function.
const toCamel = (s) => s.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
const camelizeKeys = (row) => {
  const out = {};
  for (const k of Object.keys(row || {})) out[toCamel(k)] = row[k];
  return out;
};

// ---- entities ----
const entities = {
  Player: {
    async list(/* order, limit */) {
      const uid = await currentUserId();
      if (!uid) return [];
      const { data, error } = await supabase.from('players').select('*').eq('user_id', uid).limit(5);
      if (error) throw error;
      return data || [];
    },
    // Creation is server-side now (ensure-player). reload() calls the function
    // directly; this guards against any stray direct-create call.
    async create() {
      throw new Error('Player.create is server-side — use functions.invoke("ensure-player")');
    },
    async update(_id, patch) {
      const uid = await currentUserId();
      if (!uid) throw new Error('Not authenticated');
      const cosmetic = {};
      for (const [camel, snake] of Object.entries(COSMETIC_MAP)) {
        if (patch[camel] !== undefined) cosmetic[snake] = patch[camel];
      }
      if (Object.keys(cosmetic).length === 0) return null; // nothing client-writable to persist
      const { data, error } = await supabase
        .from('players').update(cosmetic).eq('user_id', uid).select().maybeSingle();
      if (error) throw error;
      return data;
    },
  },
  LeaderboardEntry: {
    async filter(where = {}, order, limit) {
      let q = supabase.from('leaderboard_entries').select('*');
      if (where.category) q = q.eq('category', where.category);
      // Period boards: period 'alltime'|'daily'|'weekly'|'monthly' plus its
      // key ('' / '2026-08-01' / '2026-W31' / '2026-08'). A new key IS the
      // reset — no cron ever wipes rows.
      if (where.period) q = q.eq('period', where.period);
      if (where.periodKey !== undefined) q = q.eq('period_key', where.periodKey);
      if (order) {
        const desc = String(order).startsWith('-');
        q = q.order(desc ? String(order).slice(1) : order, { ascending: !desc });
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      // Rows come back snake_case (owner_id, display_name, avatar_emoji, …) but
      // the UI reads camelCase (e.ownerId, e.displayName, e.avatarEmoji). Map
      // keys so names/avatars render and the "you" highlight (ownerId) matches —
      // same top-level camelCase contract every Edge Function returns.
      return (data || []).map(camelizeKeys);
    },
  },
};

// ---- functions ----
const functions = {
  async invoke(name, body) {
    const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
    if (error) {
      // Surface the function's own { error } body — supabase-js otherwise throws
      // the useless generic "Edge Function returned a non-2xx status code".
      let detail = null;
      try { detail = await error.context?.json?.(); } catch { /* body not JSON */ }
      if (detail?.error) {
        const e = new Error(detail.error);
        e.status = error.context?.status;
        throw e;
      }
      throw error;
    }
    return { data }; // match Base44's { data } shape
  },
};

export const base44 = { auth, entities, functions };
