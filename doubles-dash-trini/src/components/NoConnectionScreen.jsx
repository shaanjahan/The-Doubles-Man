import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

// Shown when a transient transport failure is detected after an OAuth
// redirect (e.g. Apple / Google sign-in landing on /home with the WebView's
// network still re-establishing). Avoids silently bouncing the freshly
// signed-in user back to /login, which used to force repeated sign-ins.
//
// Auto-retry bounds: the screen remounts on every failed retry, so a bare
// mount-timeout would loop forever. We cap consecutive *automatic* retries
// per outage and rely on the `online` event + the manual button beyond that.
// The counter is module-scoped so successive mounts keep counting.
let autoRetryAttempts = 0;
const MAX_AUTO_RETRIES = 3;

export default function NoConnectionScreen({ onRetry, message }) {
  const [busy, setBusy] = React.useState(false);

  // If connectivity returns while this screen is showing, retry automatically
  // so the user doesn't have to tap anything.
  React.useEffect(() => {
    if (!onRetry) return;
    function onOnline() { onRetry(); }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [onRetry]);

  // After the Apple/Google OAuth redirect the WebView is briefly unreachable
  // even though `navigator.onLine` is true, so the `online` event above never
  // fires and the freshly-signed-in user used to get stranded here. A few
  // scheduled retries clear that sub-second blip without user interaction.
  React.useEffect(() => {
    if (!onRetry || autoRetryAttempts >= MAX_AUTO_RETRIES) return;
    const delay = 2500 + autoRetryAttempts * 2000;
    const t = setTimeout(() => {
      autoRetryAttempts += 1;
      onRetry();
    }, delay);
    return () => clearTimeout(t);
  }, [onRetry]);

  async function handle() {
    if (busy) return;
    setBusy(true);
    // Manual tap = user-driven reset; give the auto-retry a fresh budget in
    // case connectivity drops again later.
    autoRetryAttempts = 0;
    try { onRetry && await onRetry(); }
    finally { setTimeout(() => setBusy(false), 600); }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6 text-center app-shell">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-extrabold text-foreground mb-2">No connection</h1>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        {message || "We couldn't reach the server. Check your internet and try again."}
      </p>
      <button
        onClick={handle}
        disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold active:scale-95 transition disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}