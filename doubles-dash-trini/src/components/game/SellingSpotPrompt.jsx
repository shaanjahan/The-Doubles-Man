import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LOCATIONS, trinidadDayStr } from '@/lib/game/catalog';
import { SELLING_LOCATION_EVENT } from '@/lib/game/useSellingLocation';
import LocationPicker from '@/components/game/LocationPicker';
import { LocationIcon } from '@/components/game/art/icons';

// Open-the-app nudge: "where yuh selling today?" Shows once per Trinidad day,
// at the TOP of the screen (the daily-reward notification was moved up for the
// same reason — anything low goes unnoticed). Sits below the daily-claim and
// prize modals in the stack, so those personal moments still come first.
const KEY = 'doubles_spot_prompt_day';

export default function SellingSpotPrompt({ player, locId, setLocId }) {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    try { localStorage.setItem(KEY, trinidadDayStr()); } catch { /* no-op */ }
    setShow(false);
  }, []);

  useEffect(() => {
    if (!player || player.needsSetup) return;
    let seen = null;
    try { seen = localStorage.getItem(KEY); } catch { return; } // private mode: skip
    if (seen === trinidadDayStr()) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [player?.userId, player?.needsSetup]);

  // Picking a spot ANY way (this prompt, or the Hub chip behind it) answers the
  // question — so the nudge retires either way. Must sit above the early
  // return: hooks can't run conditionally.
  useEffect(() => {
    if (!show) return;
    window.addEventListener(SELLING_LOCATION_EVENT, dismiss);
    return () => window.removeEventListener(SELLING_LOCATION_EVENT, dismiss);
  }, [show, dismiss]);

  if (!show) return null;

  const current = LOCATIONS.find((l) => l.id === locId) || LOCATIONS[0];

  function choose(id) {
    setLocId(id);
    dismiss();
  }

  return (
    // Centering is done with flex, NOT -translate-x-1/2: the pop-in keyframes
    // set their own transform, which would override a translate utility and
    // shove the toast off-screen.
    <div className="fixed z-[45] inset-x-3 top-[calc(4.25rem+env(safe-area-inset-top))] flex justify-center pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto bg-zinc-900/95 backdrop-blur border border-tropic-gold/40 rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2.5 animate-[pop-in_0.35s_ease-out_both]">
        <LocationIcon id={locId} size={22} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-extrabold text-tropic-gold leading-tight">Where yuh selling today?</div>
          <div className="text-[11px] text-white/70 truncate">Now: {current.name} · tap to change yuh spot</div>
        </div>
        <LocationPicker
          locations={LOCATIONS}
          businessTier={player?.businessTier || 0}
          value={locId}
          onChange={choose}
          trigger={
            <button
              type="button"
              className="shrink-0 bg-tropic-gold text-amber-950 text-[11px] font-extrabold rounded-full px-3 py-1.5 active:scale-95 transition"
            >
              Choose
            </button>
          }
        />
        <button onClick={dismiss} className="shrink-0 p-1 rounded-full text-white/50 hover:bg-white/10" aria-label="Dismiss">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
