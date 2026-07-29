import React from 'react';
import { MAGIC_SAUCES, RARITY_STYLE } from '@/lib/game/catalog';
import { usePlayerState } from '@/lib/game/PlayerContext';
import SauceIcon from '@/components/SauceIcon';

// Lets the player tap the sauces they own (or just got during a round) to
// turn them on/off for the upcoming round. Reuses the same equippedSlots
// model as the Sauces tab (max 2 active), so toggles persist everywhere.
export default function SauceActivator() {
  const { player, toggleEquipSauce } = usePlayerState();
  if (!player) return null;

  const owned = (player.magicSauces || [])
    .filter((s) => s.count > 0)
    .map((slot) => ({ ...MAGIC_SAUCES.find((x) => x.id === slot.id) || {}, count: slot.count, id: slot.id }))
    .filter((s) => s.name);
  const equipped = player.equippedSauces || [];

  if (owned.length === 0) {
    return (
      <div>
        <div className="text-[11px] font-extrabold text-tropic-coral uppercase mb-1">Choose & Activate Sauces</div>
        <p className="text-xs text-white/40">You have no sauces yet — open a Mystery Pack on the Sauces tab.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-[11px] font-extrabold text-tropic-coral uppercase mb-2 flex items-center justify-between">
        <span>Tap to Activate</span>
        <span className="text-tropic-gold">{equipped.length}/2 active</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {owned.map((s) => {
          const active = equipped.includes(s.id);
          const style = RARITY_STYLE[s.rarity] || RARITY_STYLE.Common;
          return (
            <button
              key={s.id}
              onClick={() => toggleEquipSauce(s.id)}
              className={`relative flex flex-col gap-1.5 rounded-2xl p-3 text-left transition active:scale-95 no-tap-highlight border-2 min-h-[6.5rem] ${
                active
                  ? 'bg-emerald-500/15 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                <SauceIcon sauce={s} sizeClass="w-12 h-12" emojiClass="text-3xl" />
                {active && (
                  <span className="ml-auto text-[9px] font-extrabold text-emerald-300 bg-emerald-500/30 rounded-full px-2 py-0.5">ON</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-sm text-foreground leading-tight truncate">{s.name}</div>
                <div className={`text-[9px] font-bold uppercase ${style.text}`}>{s.rarity}</div>
                <div className="text-[10px] text-white/50 leading-snug mt-0.5 line-clamp-2">{s.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}