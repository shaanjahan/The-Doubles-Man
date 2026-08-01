import React from 'react';
import { Image } from '@/components/ui/image';
import { INGREDIENTS } from '@/lib/game/catalog';

export default function IngredientButton({ ingredientId, onClick, disabled }) {
  const ing = INGREDIENTS[ingredientId];
  if (!ing) return null;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // h-[5.5rem]: the old 4.75rem couldn't hold p-2 + 48px art + gap + label
      // (~86px of content in 76px) — the ingredient art clipped at the top.
      // touch-manipulation + duration-75 keep rapid serve-tapping snappy (no
      // double-tap gesture delay, no lingering pressed state).
      className={`flex flex-col items-center justify-center gap-1 w-[4.75rem] h-[5.5rem] rounded-2xl p-2 transition duration-75 shadow-sm active:scale-90 disabled:opacity-50 no-tap-highlight touch-manipulation select-none ${ing.palette.bg} ${ing.palette.ring} ring-1`}
    >
      {ing.image ? (
        <Image src={ing.image} alt={ing.label} fittingType="fit" className="w-12 h-12 shrink-0" />
      ) : (
        <span className="text-3xl leading-none">{ing.emoji}</span>
      )}
      <span className={`text-[11px] font-extrabold ${ing.onDark ? 'text-white' : 'text-slate-700'}`}>
        {ing.label}
      </span>
    </button>
  );
}