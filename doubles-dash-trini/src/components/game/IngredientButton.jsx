import React from 'react';
import { Image } from '@/components/ui/image';
import { INGREDIENTS } from '@/lib/game/catalog';
import { IconPepper, IconPlate } from '@/components/game/art/icons';

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
        // Framed tile, not bare art: several source images (tamarind, cucumber,
        // shadow beni) are cropped edge-to-edge IN THE FILE — rendered bare
        // they read as "cut off" no matter the button size. Inside a rounded
        // frame (same treatment as the order-bubble chips) the identical art
        // reads as an intentional product tile.
        <span className="w-12 h-12 rounded-xl overflow-hidden shrink-0 block">
          <Image src={ing.image} alt={ing.label} fittingType="fill" className="w-full h-full block" />
        </span>
      ) : ing.id.startsWith('pepper_') ? (
        <span className="w-12 h-12 flex items-center justify-center shrink-0">
          <IconPepper level={ing.id.replace('pepper_', '')} size={42} />
        </span>
      ) : (
        <span className="w-12 h-12 flex items-center justify-center shrink-0"><IconPlate size={40} /></span>
      )}
      <span className={`text-[11px] font-extrabold leading-tight text-center ${ing.onDark ? 'text-white' : 'text-slate-700'}`}>
        {ing.label}
      </span>
    </button>
  );
}