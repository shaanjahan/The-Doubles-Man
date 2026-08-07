import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';
import { IconTrophy, IconMedal, IconCrown, IconFlame } from '@/components/game/art/icons';

// One-time "what's new" announcement (per device, localStorage). Bump the KEY
// to announce something new; EXPIRES hides it from players who first open the
// app after the news is old. Sits BELOW the daily-claim modal (z-50) and the
// PAYDAY popup (z-70) so personal moments always front the stack.
const KEY = 'doubles_announce_prizes_v1';
const EXPIRES = Date.parse('2026-08-21T00:00:00-04:00');

export default function AnnouncementModal() {
  const { player } = usePlayerState();
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  if (!player || closing) return null;
  if (Date.now() > EXPIRES) return null;
  try { if (localStorage.getItem(KEY)) return null; } catch { return null; }

  function dismiss() {
    try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    setClosing(true);
  }
  function goToBoards() {
    dismiss();
    navigate('/leaderboard');
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-tropic-carnival px-4 pt-5 pb-4 text-center text-foreground relative">
          <button onClick={dismiss} className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10">
            <X size={18} />
          </button>
          <div className="flex justify-center mb-1"><IconTrophy size={40} /></div>
          <h2 className="text-xl font-extrabold tracking-wide">NEW: DE BOARDS PAY OUT!</h2>
        </div>

        <div className="px-4 py-3 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <IconMedal size={20} tone="gold" />
            <p className="text-[12px] text-zinc-200 font-bold leading-snug flex-1">
              Top 3 on every Daily, Weekly & Monthly board now win real prizes —
              up to <span className="text-tropic-gold">$2,000,000</span>
              <CoinIcon className="w-3.5 h-3.5 inline -mt-0.5 mx-0.5" /> and 250
              <GemIcon className="w-3.5 h-3.5 inline -mt-0.5 ml-0.5" /> — paid at midnight.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <IconCrown size={20} />
            <p className="text-[12px] text-zinc-200 font-bold leading-snug flex-1">
              The weekly Best Round champ wears the <span className="text-tropic-gold">Vendor of the Week</span> crown on every board.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <IconFlame size={20} />
            <p className="text-[12px] text-zinc-200 font-bold leading-snug flex-1">
              Yuh daily reward is now a <span className="text-tropic-gold">30-day streak calendar</span> — day 30 drops a Legendary sauce.
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 pt-1 space-y-2">
          <button
            onClick={goToBoards}
            className="w-full py-3 rounded-2xl bg-tropic-gold text-amber-950 font-extrabold text-sm active:scale-95 transition"
          >
            See de Prizes on the Boards
          </button>
          <button
            onClick={dismiss}
            className="w-full py-2 rounded-2xl text-zinc-400 font-bold text-xs hover:bg-white/5 transition"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
