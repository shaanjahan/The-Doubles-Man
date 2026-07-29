import React from 'react';
import { Image } from '@/components/ui/image';
import { INGREDIENTS } from '@/lib/game/catalog';

// Pepper level → colored letter badge (matches the PepperSlider buttons).
const PEPPER_BADGE = {
  pepper_none:   { letter: 'N', color: '#ffffff' },
  pepper_slight: { letter: 'M', color: '#fde047' },
  pepper_medium: { letter: 'M', color: '#fb923c' },
  pepper_heavy:  { letter: 'H', color: '#ef4444' },
};

export default function OrderBubble({ order }) {
  if (!order) return null;
  const pepper = order.pepper;
  const pepperBadge = PEPPER_BADGE[pepper];
  const chips = [
    INGREDIENTS['bara'],
    INGREDIENTS['channa'],
    ...order.toppings.map((id) => INGREDIENTS[id]),
    ...order.sauces.map((id) => INGREDIENTS[id]),
    ...order.extras.map((id) => INGREDIENTS[id]),
  ].filter(Boolean);

  return (
    <div className="bg-black/60 backdrop-blur rounded-2xl px-1.5 py-1 shadow-md border border-white/15 flex flex-wrap items-center justify-center gap-1 max-w-[150px] animate-[pop-in_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`rounded-md ring-1 overflow-hidden flex items-center justify-center ${c.palette.bg} ${c.palette.ring}`}
        >
          {c.image ? (
            <Image src={c.image} alt={c.label} fittingType="fit" className="w-7 h-7 block" />
          ) : (
            <span className={`text-base px-1 py-0.5 ${c.onDark ? 'text-white' : ''}`}>{c.emoji}</span>
          )}
        </span>
      ))}
      {pepperBadge && (
        <span
          className="rounded-md ring-1 ring-white/15 flex items-center justify-center bg-black/40 px-1.5 py-0.5 text-base font-extrabold leading-none"
          style={{ color: pepperBadge.color }}
        >
          {pepperBadge.letter}
        </span>
      )}
    </div>
  );
}