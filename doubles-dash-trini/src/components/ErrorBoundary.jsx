import React from 'react';
import { IconPlate } from '@/components/game/art/icons';

// The app had no error boundary, so a single render-time exception unmounted
// the whole React tree — leaving a blank dark screen the user could not
// recover from ("not allowing me to go back in"). This boundary catches any
// such crash and shows a recovery screen with a hard-reload button, so a
// transient render error never permanently blanks the app.
//
// When a crash recurs on every reload ("The stall tipped over" loop), the
// user — and we — need to see WHAT threw and WHERE. The boundary keeps the
// error message and component stack from componentDidCatch in state and shows
// them, so the next loop names the offending component/line instead of just
// the generic burrito — otherwise the user clicks Restart forever.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ error, componentStack: info?.componentStack || null });
  }

  handleReload = () => {
    // Hard reload to the app root. Reloading to a deep SPA path (e.g. /home)
    // 404s in the mobile WebView — there is no physical file there — so the
    // "Restart" button appeared to do nothing. The root always serves the
    // app shell, guaranteeing a real recovery. `replace` keeps the crashed
    // screen out of the back-history.
    window.location.replace('/');
  };

  handleClear = () => {
    // A render crash that recurs on every reload is often driven by poisoned
    // client-side state (e.g. a half-written round snapshot or a stale
    // activity stamp). Drop the game's own localStorage keys before reloading
    // so the loop doesn't re-poison on the next mount. The auth token is left
    // alone so the user isn't also bounced to /login.
    try {
      localStorage.removeItem('doubles_pendingRound');
      localStorage.removeItem('base44_last_active');
    } catch {}
    window.location.replace('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error || 'Unknown error');
    const showStack = import.meta.env?.DEV ? this.state.componentStack : null;

    return (
      <div className="min-h-screen bg-doubles-night flex flex-col items-center justify-center text-center px-6">
        <div className="mb-3 flex justify-center"><IconPlate size={56} /></div>
        <h1 className="text-2xl font-extrabold text-tropic-gold tracking-wide">
          The stall tipped over!
        </h1>
        <p className="text-sm text-white/70 mt-2 max-w-xs">
          Something went wrong on this screen. Restart to get back to serving.
        </p>

        {/* The actual error that tripped the boundary. On a recurring
            "tipped over" loop this names the offending component/line so the
            crash can be fixed instead of the user clicking Restart forever.
            Full component stack only in dev to avoid leaking internals. */}
        <div className="mt-4 w-full max-w-sm text-left bg-black/40 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] uppercase font-bold text-tropic-coral tracking-wide mb-1">Error</div>
          <code className="block text-[11px] text-white/80 font-mono break-words whitespace-pre-wrap">{msg}</code>
          {showStack && (
            <details className="mt-2">
              <summary className="text-[10px] text-white/50 cursor-pointer">Component stack</summary>
              <code className="block mt-1 text-[10px] text-white/50 font-mono whitespace-pre-wrap">{showStack}</code>
            </details>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          <button
            onClick={this.handleReload}
            className="bg-gradient-to-r from-tropic-magenta to-tropic-sea text-white font-extrabold px-5 py-3 rounded-2xl shadow-xl active:scale-95 transition"
          >
            Restart
          </button>
          <button
            onClick={this.handleClear}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-3 rounded-2xl active:scale-95 transition"
          >
            Clear saved data
          </button>
        </div>
      </div>
    );
  }
}