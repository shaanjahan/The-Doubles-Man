import React from 'react';

// Soft rising steam — shown over the prep board while hot food (bara/channa)
// is on the board. Purely decorative, pointer-events-none.
export default function SteamPuffs({ active }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute -top-1 left-0 right-0 flex justify-center gap-3 z-10">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block w-2.5 h-2.5 rounded-full bg-white/45 blur-[3px] animate-steam-rise"
          style={{ animationDelay: `${i * 0.5}s` }}
        />
      ))}
    </div>
  );
}