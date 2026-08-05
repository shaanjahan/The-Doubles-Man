import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight } from 'lucide-react';
import PageTour from './PageTour';
import {
  PLAY_TOUR_STEPS, HUB_TOUR_STEPS, STORE_TOUR_STEPS,
  LEADERBOARD_TOUR_STEPS, UPGRADES_TOUR_STEPS, BUSINESS_TOUR_STEPS,
} from './tours';
import { IconPan, IconHome, IconCart, IconTrophy, IconStar, IconStorefront } from '@/components/game/art/icons';

const SECTIONS = [
  { key: 'play',        label: 'How to Serve Doubles', Icon: IconPan,        steps: PLAY_TOUR_STEPS },
  { key: 'hub',         label: 'The Hub (Home)',       Icon: IconHome,       steps: HUB_TOUR_STEPS },
  { key: 'store',       label: 'The Store',             Icon: IconCart,       steps: STORE_TOUR_STEPS },
  { key: 'leaderboard', label: 'Leaderboards',          Icon: IconTrophy,     steps: LEADERBOARD_TOUR_STEPS },
  { key: 'upgrades',    label: 'Upgrades',              Icon: IconStar,       steps: UPGRADES_TOUR_STEPS },
  { key: 'business',    label: 'My Business',          Icon: IconStorefront, steps: BUSINESS_TOUR_STEPS },
];

export default function InstructionsModal({ open, onClose }) {
  const [active, setActive] = useState(null);
  if (!open) return null;

  // While a tour is playing, the tour overlay owns the screen; closing it
  // returns here to the section list (not straight out of the modal).
  const cur = active ? SECTIONS.find((s) => s.key === active) : null;
  if (cur) {
    return <PageTour steps={cur.steps} onClose={() => setActive(null)} finishLabel="Back to list" />;
  }

  // Rendered through a portal to <body> so it can never be positioned relative
  // to (or clipped by) a transformed/overflow-hidden ancestor like the Hub hero
  // card — otherwise `fixed inset-0` anchors to that card and the modal shows
  // as a cut-off panel at the top instead of a centered full-screen window.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-5 py-6 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto bg-fire-tile rounded-3xl p-5 shadow-2xl border border-white/10 animate-[slideUp_0.25s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-90 transition z-10"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-extrabold text-center text-tropic-gold tracking-wide">How to Play</h2>
        <p className="mt-1 text-xs text-white/70 text-center">Tap a section to walk through it anytime.</p>

        <div className="mt-4 space-y-2">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl px-3 py-2.5 text-left active:scale-95 transition"
            >
              <span className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><s.Icon size={22} /></span>
              <span className="flex-1 font-bold text-foreground text-sm">{s.label}</span>
              <ChevronRight size={18} className="text-white/40 shrink-0" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-md py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-tropic-magenta to-tropic-sea shadow-lg active:scale-95 transition"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}