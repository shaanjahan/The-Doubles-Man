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
      // min-h (not fixed h): the button GROWS to fit its content, so the art
      // can never clip regardless of device text-size settings or font
      // rendering — fixed heights (4.75rem, then 5.5rem) kept clipping on some
      // devices. Row-mates stay aligned because flex stretches to the tallest.
      // touch-manipulation + duration-75 keep rapid serve-tapping snappy.
      className={`flex flex-col items-center justify-center gap-1 w-[4.75rem] min-h-[5.5rem] rounded-2xl p-2 transition duration-75 shadow-sm active:scale-90 disabled:opacity-50 no-tap-highlight touch-manipulation select-none ${ing.palette.bg} ${ing.palette.ring} ring-1`}
    >
      {ing.image ? (
        <Image src={ing.image} alt={ing.label} fittingType="fit" className="w-12 h-12 shrink-0" />
      ) : (
        <span className="text-3xl leading-none">{ing.emoji}</span>
      )}
      <span className={`text-[11px] font-extrabold leading-tight text-center ${ing.onDark ? 'text-white' : 'text-slate-700'}`}>
        {ing.label}
      </span>
    </button>
  );
}