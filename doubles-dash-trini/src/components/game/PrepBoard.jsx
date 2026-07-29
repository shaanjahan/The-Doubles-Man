import React from 'react';
import SteamPuffs from './SteamPuffs';
import DoublesStack from './DoublesStack';

export default function PrepBoard({ prepIds, onClear }) {
  const hot = prepIds.includes('bara') || prepIds.includes('channa');
  return (
    <div className="relative bg-fire-tile rounded-2xl border border-white/10 shadow-inner p-2 mx-3">
      <SteamPuffs active={hot} />
      <div className="text-[10px] font-extrabold text-tropic-gold uppercase tracking-wide px-1 flex items-center justify-between">
        <span>Your Doubles</span>
        {prepIds.length > 0 && (
          <button onClick={onClear} className="text-[11px] text-tropic-coral hover:underline font-bold">
            Clear
          </button>
        )}
      </div>
      <DoublesStack prepIds={prepIds} />
    </div>
  );
}