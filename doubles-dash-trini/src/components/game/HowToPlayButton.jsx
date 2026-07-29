import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import InstructionsModal from './InstructionsModal';

// Small, absolute button tucked into the Hub hero so it never pushes other
// content around. Opens a list of every page's walkthrough to review on demand.
export default function HowToPlayButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How to play"
        className="absolute right-3 bottom-3 z-10 flex items-center gap-1 bg-black/40 hover:bg-black/60 text-white text-[11px] font-bold rounded-full pl-1.5 pr-2.5 py-1 border border-white/15 backdrop-blur active:scale-95 transition"
      >
        <span className="w-5 h-5 rounded-full bg-tropic-gold text-black flex items-center justify-center">
          <HelpCircle size={12} />
        </span>
        How to Play
      </button>
      <InstructionsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}