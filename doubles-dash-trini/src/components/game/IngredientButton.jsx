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
      className={`flex flex-col items-center justify-center gap-1 w-[4.75rem] h-[4.75rem] rounded-2xl p-2.5 transition shadow-sm active:scale-90 disabled:opacity-50 no-tap-highlight ${ing.palette.bg} ${ing.palette.ring} ring-1`}
    >
      {ing.image ? (
        <Image src={ing.image} alt={ing.label} fittingType="fit" className="w-12 h-12" />
      ) : (
        <span className="text-3xl leading-none">{ing.emoji}</span>
      )}
      <span className={`text-[11px] font-extrabold ${ing.onDark ? 'text-white' : 'text-slate-700'}`}>
        {ing.label}
      </span>
    </button>
  );
}