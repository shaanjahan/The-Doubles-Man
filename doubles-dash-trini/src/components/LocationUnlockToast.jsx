import React from 'react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { LocationIcon } from '@/components/game/art/icons';
import CoinIcon from '@/components/CoinIcon';

// Rank-up reward callout: appears when the player's new business tier opens
// one or more selling locations. Sits above the achievement toast slot so the
// two never overlap when a level-up fires both at once. Tap to dismiss.
export default function LocationUnlockToast() {
  const { unlockedLocations, clearUnlockedLocations } = usePlayerState();
  if (!unlockedLocations || unlockedLocations.length === 0) return null;
  const l = unlockedLocations[unlockedLocations.length - 1];
  return (
    <div
      onClick={clearUnlockedLocations}
      className="fixed bottom-44 md:bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] cursor-pointer"
    >
      <div className="bg-white shadow-2xl rounded-2xl border border-sky-300 px-4 py-3 flex items-center gap-3 animate-[slideUp_0.25s_ease-out]">
        <LocationIcon id={l.id} size={34} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-sky-600 font-extrabold">
            New Location Unlocked!
          </div>
          <div className="font-extrabold text-slate-800 text-sm truncate">{l.name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">
            Base reward {l.baseReward} <CoinIcon className="w-3 h-3 inline-block" /> per order
          </div>
        </div>
      </div>
    </div>
  );
}
