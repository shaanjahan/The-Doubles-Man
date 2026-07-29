import React from 'react';
import { Image } from '@/components/ui/image';
import CoinIcon from '@/components/CoinIcon';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { UPGRADES, upgradeCost } from '@/lib/game/catalog';

export default function Upgrades() {
  const { player, buyUpgrade } = usePlayerState();
  if (!player) return null;

  return (
    <div className="max-w-2xl mx-auto px-3 pt-3 pb-6 space-y-3">
      <h1 className="text-3xl font-extrabold text-tropic-coral tracking-wide">Upgrades</h1>
      <p className="text-xs text-white/60">Spend dollars to make your stall run faster and smarter.</p>

      <div className="grid gap-2">
        {UPGRADES.map((u, i) => {
          const level = player.upgrades[u.id] || 0;
          const maxed = level >= u.maxLevel;
          const cost = upgradeCost(u, level);
          const afford = player.coins >= cost;
          return (
            <div key={u.id} className="bg-white rounded-2xl p-3 shadow border border-amber-100 flex items-center gap-3">
              <div
                className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden animate-[float-soft_4.5s_ease-in-out_infinite]"
                style={{ animationDelay: `${(i % 6) * 0.4}s` }}
              >
                {u.image ? (
                  <Image src={u.image} alt={u.name} className="w-full h-full object-cover" fittingType="fill" />
                ) : (
                  <span className="text-2xl">{u.emoji}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-800 text-sm">{u.name}</div>
                <div className="text-[11px] text-slate-500">{u.description}</div>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: u.maxLevel }).map((_, i) => (
                    <span key={i} className={`w-5 h-1 rounded-full ${i < level ? 'bg-amber-400' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                {maxed ? (
                  <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1.5 rounded-full">MAX</div>
                ) : (
                  <>
                    <div className="text-[11px] font-bold text-amber-700 flex items-center justify-end gap-0.5">
                      <CoinIcon className="w-3.5 h-3.5 inline-block" /> {cost}
                    </div>
                    <button
                      onClick={() => buyUpgrade(u)}
                      disabled={!afford}
                      className={`mt-1 text-xs font-extrabold px-3 py-1.5 rounded-full transition ${afford ? 'bg-amber-400 text-white hover:bg-amber-500 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      Buy
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}