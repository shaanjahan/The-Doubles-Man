import React from 'react';

// Spice level picker. Pepper levels are mutually exclusive and toggle on tap:
// tapping a different level swaps it in; tapping the active level removes it.
// The active level is derived from the live prep board (prepIds) so the
// highlight stays in sync even when the ingredient is removed elsewhere.
const STOPS = [
  { id: 'pepper_none',   label: 'None',   letter: 'N', color: '#ffffff', tint: 'bg-white/10' },
  { id: 'pepper_slight', label: 'Mild',   letter: 'M', color: '#fde047', tint: 'bg-yellow-500/15' },
  { id: 'pepper_medium', label: 'Medium',  letter: 'M', color: '#fb923c', tint: 'bg-orange-500/15' },
  { id: 'pepper_heavy',  label: 'Hot',    letter: 'H', color: '#ef4444', tint: 'bg-red-500/15' },
];

export default function PepperSlider({ prepIds = [], onAdd }) {
  const active = (prepIds || []).find((x) => x.startsWith('pepper_')) || null;

  return (
    <div className="mb-2 px-1">
      <div className="text-[10px] font-extrabold text-tropic-gold uppercase tracking-wide mb-2">
        Spice Level
      </div>
      <div className="flex gap-2">
        {STOPS.map((s, i) => {
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              onClick={() => onAdd(s.id)}
              className={`flex-1 ${s.tint} rounded-2xl py-2 px-1 flex flex-col items-center gap-0.5 transition active:scale-90 no-tap-highlight ${
                isActive ? 'ring-2 ring-white/80' : 'ring-1 ring-white/10'
              }`}
              aria-label={`${s.label} pepper`}
            >
              <span className="text-xl font-extrabold leading-none" style={{ color: s.color }}>
                {s.letter}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-white/60">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}