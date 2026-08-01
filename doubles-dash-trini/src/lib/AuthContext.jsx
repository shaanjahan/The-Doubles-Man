import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, supabase } from '@/api/base44Client';

// Sessions persist until the player explicitly logs out (profile -> account
// dialog). The old 1-hour inactivity logout (a Base44-era carryover) forced a
// fresh sign-in after any absence >1h — wrong for a casual game, and it could
// bounce an App Review session mid-review. resetActivityStamp stays exported
// as a no-op (Login/Register still call it) and clears the legacy stamp.
export function resetActivityStamp() {
  try { localStorage.removeItem('base44_last_active'); } catch {}
}

// A transient network failure after Apple/Google OAuth redirects back to the
// app used to be treated as an auth error and bounce the player to /login,
// forcing them to sign in again and again until the post-redirect fetch
// happened to succeed. Network blips are flagged separately so we can show a
// "No connection" retry screen instead of silently dropping the freshly
// signed-in session and sending the user back to the login form.
function isNetworkError(e) {
  if (!e) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (e.status === 0) return true;
  // Any real HTTP status means the server responded (auth/permission), not a
  // transport failure — let the existing handler deal with it.
  if (e.status) return false;
  const text = `${e.message || ''} ${e.code || ''}`;
  return /network error|timeout|err_network|failed to fetch|network request failed|load failed|internet|disconnected/i.test(text);
}

// Right after an Apple/Google OAuth redirect, the WebView's network is still
// re-establishing and the first auth/me() fetch can fail with a transport
// error that's gone a moment later. Rather than parking the freshly-signed-in
// user on the "No connection" screen for a one-off blip, retry a few times
// with a short backoff before declaring a network failure. Non-network errors
// (real HTTP statuses) pass through immediately and are handled by the caller.
const NETWORK_RETRIES = 3;
const NETWORK_RETRY_BASE_MS = 500;
async function withNetworkRetry(fn) {
  let lastErr;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!isNetworkError(e) || attempt >= NETWORK_RETRIES) throw e;
      await new Promise((r) => setTimeout(r, NETWORK_RETRY_BASE_MS * (attempt + 1)));
    }
  }
}

// Watchdog for the boot-time auth/public-settings calls: a hung fetch (no
// network rejection, no resolution — e.g. a WebView stuck mid-handshake)
// otherwise leaves the splash on screen forever, trapping the user so they
// can't reach login. Racing the call against a timeout lets the existing
// network-error path surface the "No connection" retry screen instead.
const AUTH_TIMEOUT_MS = 10000;
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const e = new Error('timeout');
      e.status = 0; // classified as a transport failure by isNetworkError
      setTimeout(() => reject(e), ms);
    }),
  ]);
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  // React to Supabase auth changes. This is the fix for Apple/Google sign-in
  // making users authenticate 2–3 times: after the OAuth redirect to /home, the
  // provider code is still being exchanged for a session, so the one-shot me()
  // in checkUserAuth() resolves to null and ProtectedRoute bounces to /login.
  // Nothing previously listened for the session that lands a moment later, so
  // the app stayed on /login until the user tried again. onAuthStateChange fires
  // SIGNED_IN the instant the exchange completes — promote to authenticated then
  // (Login also redirects to /home once isAuthenticated flips). SIGNED_OUT keeps
  // state in sync with token expiry / logout from anywhere.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        setNetworkError(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-recover the moment connectivity returns: if we previously parked on
  // the "No connection" retry screen, re-run the app state check so the user
  // doesn't have to tap anything.
  useEffect(() => {
    function onOnline() {
      setNetworkError((prev) => {
        if (prev) checkAppState();
        return prev;
      });
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const checkAppState = async () => {
    try {
      setAuthError(null);
      setNetworkError(false);
      // Base44's "public-settings" bootstrap is gone under Supabase — auth state
      // is simply the Supabase session. No app-level pre-check is needed; the
      // router (ProtectedRoute) gates the game routes, public pages render.
      setAppPublicSettings(null);
      setIsLoadingPublicSettings(false);

      await checkUserAuth();
    } catch (error) {
      console.error('Unexpected error:', error);
      if (isNetworkError(error)) {
        setNetworkError(true);
      } else {
        setAuthError({
          type: 'unknown',
          message: error.message || 'An unexpected error occurred'
        });
      }
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await withNetworkRetry(() => withTimeout(base44.auth.me(), AUTH_TIMEOUT_MS));
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        // The adapter's me() returns null when there's no Supabase session
        // (Base44's SDK threw instead) — treat that as simply not authenticated.
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
      } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // Transport blip while confirming the Apple/Google-signed-in user: park
      // on the "No connection" retry screen instead of bouncing to /login,
      // which would force the user to sign in with Apple all over again.
      if (isNetworkError(error)) {
        setNetworkError(true);
        return;
      }
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    resetActivityStamp();

    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      networkError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};