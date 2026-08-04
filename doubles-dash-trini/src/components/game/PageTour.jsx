import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconTap } from '@/components/game/art/icons';

// Small pulsing "tap here" tag dropped onto the exact button a step highlights.
export function TapBadge({ children = 'Tap here' }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-black bg-tropic-gold rounded-full px-2 py-0.5 shadow animate-[wiggle_1.3s_ease-in-out_infinite] whitespace-nowrap">
      <IconTap size={12} /> {children}
    </span>
  );
}

// Generic stepped walkthrough overlay. Each step's `visual` is a genuine
// mock of the screen's real button (same classes/tokens), so the tutorial
// shows the actual control and where to tap it — not a vague description.
export default function PageTour({ steps, onClose, finishLabel = "Got it" }) {
  const [step, setStep] = useState(0);
  const total = steps.length;
  const cur = steps[step] || steps[0];
  const isLast = step === total - 1;

  function next() {
    if (isLast) onClose();
    else setStep((s) => s + 1);
  }

  // Portal to <body> for the same reason as InstructionsModal: this fixed
  // overlay must anchor to the viewport, not to whatever (possibly transformed /
  // overflow-hidden) ancestor rendered it — e.g. the Hub hero card.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-5 py-6 animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto bg-fire-tile rounded-3xl p-5 shadow-2xl border border-white/10 animate-[slideUp_0.25s_ease-out]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-90 transition z-10"
        >
          <X size={16} />
        </button>

        <div className="rounded-2xl bg-black/30 border border-white/10 p-4 min-h-[128px] flex items-center justify-center">
          {cur.visual}
        </div>

        <h2 className="mt-3 text-lg font-extrabold text-center text-tropic-gold tracking-wide">{cur.title}</h2>
        <p className="mt-1.5 text-sm text-white/80 text-center leading-relaxed">{cur.body}</p>

        <div className="flex justify-center gap-1.5 mt-4">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-tropic-gold' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md py-2 text-sm font-bold text-white/70 hover:bg-white/10 transition"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-md py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-tropic-magenta to-tropic-sea shadow-lg active:scale-95 transition"
          >
            {isLast ? finishLabel : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}