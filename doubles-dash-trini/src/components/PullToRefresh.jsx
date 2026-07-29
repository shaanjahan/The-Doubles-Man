import React, { useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

// Native-style pull-to-refresh for touch devices. Wraps a scroll container,
// detects a downward drag at the top, reveals a spinner, and calls onRefresh.
// On desktop it behaves as an ordinary scroll container (touch handlers no-op).
const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh, className = '', children }) {
  const ref = useRef(null);
  const startY = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e) => {
    if (refreshing) return;
    const el = ref.current;
    if (!el) return;
    startY.current = el.scrollTop <= 0 ? e.touches[0].clientY : null;
  };

  const onTouchMove = (e) => {
    if (startY.current == null || refreshing) return;
    const el = ref.current;
    if (el && el.scrollTop > 0) { startY.current = null; return; }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(MAX_PULL, delta * 0.5));
  };

  const end = async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh?.();
      } catch {
        /* ignore */
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  const showIndicator = pull > 4 || refreshing;
  const ready = pull >= THRESHOLD;

  return (
    <div
      ref={ref}
      className={`relative flex-1 min-h-0 h-full overflow-y-auto overflow-x-hidden ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={end}
      onTouchCancel={() => { startY.current = null; if (!refreshing) setPull(0); }}
    >
      {showIndicator && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          style={{
            top: Math.max(-40, pull - 36),
            opacity: refreshing ? 1 : Math.min(1, pull / THRESHOLD),
          }}
        >
          {refreshing ? (
            <Loader2 className="w-6 h-6 text-tropic-gold animate-spin" />
          ) : (
            <RefreshCw
              className={`w-6 h-6 text-tropic-gold transition-transform ${ready ? 'animate-pulse' : ''}`}
              style={{ transform: `rotate(${Math.min(360, (pull / THRESHOLD) * 360)}deg)` }}
            />
          )}
        </div>
      )}
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pull === 0 || refreshing ? 'transform 0.25s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}