import React, { useRef, useState } from 'react';
import { Image } from '@/components/ui/image';
import { INGREDIENTS } from '@/lib/game/catalog';

// Hold-to-scoop channa: press and hold to fill the scoop with a conic meter;
// release (or a quick tap) commits the ingredient, keeping logic identical.
export default function ChannaScoop({ ingredientId = 'channa', onAdd, disabled }) {
  const ing = INGREDIENTS[ingredientId] || INGREDIENTS.channa;
  const [fill, setFill] = useState(0);
  const holding = useRef(false);
  const raf = useRef(null);
  const t0 = useRef(0);

  function loop() {
    if (!holding.current) return;
    const f = Math.min(1, (performance.now() - t0.current) / 450);
    setFill(f);
    if (f < 1) raf.current = requestAnimationFrame(loop);
  }

  function down(e) {
    if (disabled) return;
    e.preventDefault();
    holding.current = true;
    t0.current = performance.now();
    setFill(0);
    raf.current = requestAnimationFrame(loop);
  }

  function release() {
    if (!holding.current) return;
    holding.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    onAdd(ingredientId);
    setFill(0);
  }

  const deg = Math.round(fill * 360);
  return (
    <button
      disabled={disabled}
      onPointerDown={down}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      className={`relative flex flex-col items-center justify-center gap-1 w-[4.75rem] h-[4.75rem] rounded-2xl p-2.5 transition no-tap-highlight active:scale-90 ring-1 overflow-hidden ${ing.palette.bg} ${ing.palette.ring}`}
      aria-label={`Scoop ${ing.label}`}
    >
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(#f59e0b ${deg}deg, rgba(0,0,0,0.18) ${deg}deg)` }}
        />
        <div className="absolute inset-0 rounded-full bg-white/10" />
        {ing.image ? (
          <Image src={ing.image} alt={ing.label} fittingType="fit" className="relative w-10 h-10" />
        ) : (
          <span className="relative text-3xl leading-none">{ing.emoji}</span>
        )}
      </div>
      <span className={`text-[11px] font-extrabold ${ing.onDark ? 'text-white' : 'text-slate-700'}`}>
        {ing.label}
      </span>
      {fill > 0 && (
        <div className="absolute bottom-1.5 left-2 right-2 h-1 rounded-full bg-black/25">
          <div className="h-full bg-amber-500 rounded-full transition-[width] duration-75" style={{ width: `${fill * 100}%` }} />
        </div>
      )}
    </button>
  );
}