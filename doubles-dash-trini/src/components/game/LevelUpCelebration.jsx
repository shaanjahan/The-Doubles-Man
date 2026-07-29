import React, { useEffect, useState } from 'react';
import { ChevronUp, Sparkles } from 'lucide-react';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';

// Plays when a service round pushed the vendor up at least one level.
// Three beats: an XP bar "loads" the level just cleared (0 → 100%), the
// "LEVEL UP!" banner pops in with the new level number, then the bar settles
// to the real leftover progress into the *next* level while the reward
// (gems + dollars) drops in.
export default function LevelUpCelebration({
  levelBefore,
  levelAfter,
  xpAfter = 0,
  xpForNext = 1,
  rewardCoins = 0,
  rewardGems = 0,
}) {
  const [barPct, setBarPct] = useState(0);
  const [displayLevel, setDisplayLevel] = useState(levelBefore);
  const [popped, setPopped] = useState(false);

  useEffect(() => {
    // Beat 1 — fill the bar to the top (the XP that triggered the level-up).
    const t1 = setTimeout(() => setBarPct(100), 80);
    // Beat 2 — celebrate the new level and reset the bar.
    const t2 = setTimeout(() => {
      setDisplayLevel(levelAfter);
      setPopped(true);
      setBarPct(0);
    }, 1050);
    // Beat 3 — settle the bar to current progress toward the next level.
    const settlePct = Math.max(2, Math.min(100, Math.round((Number(xpAfter) / Math.max(1, xpForNext)) * 100)));
    const t3 = setTimeout(() => setBarPct(settlePct), 1850);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [levelAfter, xpAfter, xpForNext]);

  const gained = Math.max(0, levelAfter - levelBefore);

  return (
    <div className="rounded-2xl border border-tropic-gold/50 bg-gradient-to-br from-amber-500/25 to-tropic-sea/15 p-3 text-center animate-[slideUp_0.3s_ease-out]">
      <div className="flex items-center justify-center gap-1 text-tropic-gold text-xs font-extrabold uppercase tracking-widest">
        <Sparkles size={14} /> Level Up <Sparkles size={14} />
      </div>

      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="text-2xl font-extrabold text-white/50 line-through decoration-tropic-coral/60">
          {levelBefore}
        </span>
        <ChevronUp size={22} className="text-tropic-gold animate-[combo-pop_0.4s_ease-out]" />
        <span
          key={displayLevel}
          className="text-4xl font-extrabold text-tropic-gold drop-shadow animate-[pop-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          {displayLevel}
        </span>
      </div>

      <div className="mt-2 h-2.5 w-full rounded-full bg-black/40 overflow-hidden border border-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-tropic-magenta via-tropic-sea to-tropic-gold"
          style={{ width: `${barPct}%`, transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </div>
      <div className="mt-1 text-[10px] font-bold text-white/60">
        {popped ? `${Math.min(barPct, 100)}% to next level` : 'Filling the pot…'}
      </div>

      {popped && gained > 0 && (
        <div className="mt-2 flex items-center justify-center gap-3 animate-[slideUp_0.3s_ease-out]">
          <div className="flex items-center gap-1 font-extrabold text-tropic-gold">
            <CoinIcon className="w-4 h-4" /> +{rewardCoins}
          </div>
          <div className="flex items-center gap-1 font-extrabold text-tropic-sea">
            <GemIcon className="w-4 h-4" /> +{rewardGems}
          </div>
        </div>
      )}
    </div>
  );
}