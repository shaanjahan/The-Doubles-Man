import React from 'react';
import { INGREDIENTS } from '@/lib/game/catalog';
import { Trash2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { IconPepper, IconPlate } from '@/components/game/art/icons';

const PEPPER_BADGE = {
  pepper_none:   { letter: 'N', color: '#ffffff' },
  pepper_slight: { letter: 'S', color: '#fde047' },
  pepper_medium: { letter: 'M', color: '#fb923c' },
  pepper_heavy:  { letter: 'H', color: '#ef4444' },
};

// Compact horizontal strip of the ingredients the player has tapped so far,
// plus a clear button. Pepper levels render as colored letter badges (N/M/M/H).
export default function PrepBar({ prepIds, onClear }) {
  const chips = prepIds.map((id) => ({ id, ing: INGREDIENTS[id] })).filter((x) => x.ing);
  const showClear = prepIds.length > 0;

  return (
    <div className="mx-3 mt-1 flex items-center gap-2 bg-fire-tile rounded-2xl border border-white/10 px-2 py-1.5 shadow-inner">
      <div className="text-[10px] font-extrabold text-tropic-gold uppercase tracking-wide shrink-0">
        Order
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {chips.length === 0 ? (
          <span className="text-[11px] text-white/40 italic px-1">Tap ingredients to add…</span>
        ) : (
          chips.map(({ id, ing }, i) => {
            const pepper = PEPPER_BADGE[id];
            if (pepper) {
              return (
                <span
                  key={i}
                  className="shrink-0 rounded-lg ring-1 ring-white/15 flex items-center justify-center bg-black/40 px-1.5 py-1 text-base font-extrabold leading-none"
                  style={{ color: pepper.color }}
                >
                  {pepper.letter}
                </span>
              );
            }
            return (
              <span
                key={i}
                title={ing.label}
                className={`shrink-0 rounded-lg ring-1 overflow-hidden flex items-center justify-center ${ing.palette.bg} ${ing.palette.ring}`}
              >
                {ing.image ? (
                  <span className="w-7 h-7 block">
                    <Image src={ing.image} alt={ing.label} fittingType="fit" className="w-full h-full" />
                  </span>
                ) : (
                  <span className="w-7 h-7 flex items-center justify-center">
                    {ing.id?.startsWith('pepper_') ? <IconPepper level={ing.id.replace('pepper_', '')} size={22} /> : <IconPlate size={22} />}
                  </span>
                )}
              </span>
            );
          })
        )}
      </div>
      {showClear && (
        <button
          onClick={onClear}
          className="shrink-0 text-tropic-coral active:scale-90 transition"
          aria-label="Clear order"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}