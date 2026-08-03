import React from 'react';
import { usePlayerState } from '@/lib/game/PlayerContext';

export default function AchievementToast() {
  const { newlyUnlocked, clearNewlyUnlocked } = usePlayerState();
  if (!newlyUnlocked || newlyUnlocked.length === 0) return null;
  const a = newlyUnlocked[newlyUnlocked.length - 1];
  return (
    <div
      onClick={clearNewlyUnlocked}
      className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] cursor-pointer"
    >
      <div className="bg-white shadow-2xl rounded-2xl border border-amber-300 px-4 py-3 flex items-center gap-3 animate-[slideUp_0.25s_ease-out]">
        <div className="text-3xl">{a.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-amber-600 font-extrabold">
            Achievement Unlocked!
          </div>
          <div className="font-extrabold text-slate-800 text-sm truncate">{a.name}</div>
          <div className="text-xs text-slate-500 truncate">{a.description}</div>
          <div className="text-xs font-extrabold text-amber-700 mt-0.5">
            +💵 {(a.reward?.coins || 0).toLocaleString()} · +💎 {a.reward?.gems || 0}
          </div>
        </div>
      </div>
    </div>
  );
}