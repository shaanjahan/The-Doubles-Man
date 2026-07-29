import React, { useState } from 'react';
import { Image } from '@/components/ui/image';
import { INGREDIENTS } from '@/lib/game/catalog';

// Tactile sauce pourer: hold to tilt the bottle and pour a drip stream;
// a quick tap still commits the ingredient, so gameplay logic is unchanged.
export default function SauceBottle({ ingredientId = 'tamarind', onAdd, disabled }) {
  const ing = INGREDIENTS[ingredientId];
  const [pouring, setPouring] = useState(false);
  if (!ing) return null;

  const commit = () => {
    if (!pouring) return;
    setPouring(false);
    onAdd(ingredientId);
  };

  return (
    <button
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        setPouring(true);
      }}
      onPointerUp={commit}
      onPointerLeave={commit}
      onPointerCancel={commit}
      className={`relative flex flex-col items-center justify-center gap-1 w-[4.75rem] h-[4.75rem] rounded-2xl p-2.5 transition no-tap-highlight active:scale-90 ring-1 ${ing.palette.bg} ${ing.palette.ring} ${pouring ? 'animate-wiggle' : ''}`}
      aria-label={`Pour ${ing.label}`}
    >
      <div
        className="relative w-12 h-12 flex items-center justify-center origin-bottom"
        style={{
          transform: pouring ? 'rotate(-28deg) translateY(-3px)' : 'none',
          transition: 'transform 0.14s ease-out',
        }}
      >
        {ing.image ? (
          <Image src={ing.image} alt={ing.label} fittingType="fit" className="w-12 h-12 drop-shadow" />
        ) : (
          <span className="text-3xl leading-none">{ing.emoji}</span>
        )}
        {pouring && (
          <span className="absolute left-1/2 top-[78%] -translate-x-1/2 flex flex-col items-center gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block w-1.5 h-1.5 rounded-full bg-amber-700 animate-drip-fall"
                style={{ animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </span>
        )}
      </div>
      <span className={`text-[11px] font-extrabold ${ing.onDark ? 'text-white' : 'text-slate-700'}`}>
        {ing.label}
      </span>
    </button>
  );
}