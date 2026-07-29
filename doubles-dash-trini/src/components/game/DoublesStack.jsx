import React from 'react';

// Stacked, cross-section "doubles on wax paper" built from the prep ids:
// bottom bara → channa (+ pepper dots) → tamarind drizzle → toppings → top bara.
// Purely visual; the game still scores by ingredient set, not order.

const PEPPER_COLORS = {
  pepper_none: '#e5e7eb',
  pepper_slight: '#fde047',
  pepper_medium: '#fb923c',
  pepper_heavy: '#dc2626',
};

function Bara({ lid }) {
  return (
    <div
      className={`rounded-[50%] animate-[pop-in_0.25s_ease-out_both] ${lid ? '-mt-1' : ''}`}
      style={{
        height: lid ? 11 : 15,
        width: lid ? '72%' : '100%',
        background: 'linear-gradient(180deg,#eab061 0%,#c57f33 55%,#985f24 100%)',
        boxShadow:
          '0 2px 3px rgba(0,0,0,0.35), inset 0 -2px 3px rgba(0,0,0,0.25), inset 0 2px 2px rgba(255,255,255,0.22)',
        border: '1px solid rgba(120,72,20,0.45)',
      }}
    />
  );
}

export default function DoublesStack({ prepIds }) {
  const baras = prepIds.filter((id) => id === 'bara').length;
  const has = (id) => prepIds.includes(id);
  const pepperId = prepIds.find((id) => id.startsWith('pepper_'));
  const toppings = prepIds.filter((id) => id === 'cucumber' || id === 'shadow_beni');

  if (prepIds.length === 0) {
    return (
      <div className="flex items-center justify-center py-3 text-[11px] italic text-white/40">
        Build your doubles on the wrapper…
      </div>
    );
  }

  const showPepper = pepperId && pepperId !== 'pepper_none';

  return (
    <div className="flex flex-col items-center py-1">
      {/* Wax-paper wrapper */}
      <div className="relative w-36 pb-1">
        <div className="absolute inset-x-0 -bottom-1 h-6 -rotate-1 rounded-b-[45%] bg-[#f0e3bf] shadow-sm" />
        <div className="absolute -left-1 inset-y-1 w-4 rotate-6 bg-[#f6ecd2] rounded-l-xl" />
        <div className="absolute -right-1 inset-y-1 w-4 -rotate-6 bg-[#f6ecd2] rounded-r-xl" />

        <div className="relative flex flex-col items-center px-2">
          {baras >= 1 && <Bara lid={false} />}

          {has('channa') && (
            <div
              className="relative rounded-[50%] -mt-1 w-[90%] animate-[pop-in_0.25s_ease-out_both]"
              style={{
                height: 17,
                background: 'radial-gradient(circle at 30% 30%,#fde68a 0%,#f4c542 45%,#d99b1f 100%)',
                boxShadow: 'inset 0 -2px 3px rgba(120,80,0,0.35), 0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {showPepper &&
                [0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="absolute w-1.5 h-1.5 rounded-full"
                    style={{
                      left: `${10 + i * 18}%`,
                      top: `${3 + (i % 2) * 5}px`,
                      background: PEPPER_COLORS[pepperId],
                      boxShadow: '0 0 3px rgba(0,0,0,0.4)',
                    }}
                  />
                ))}
            </div>
          )}

          {showPepper && !has('channa') && baras >= 1 && (
            <div className="relative -mt-0.5 w-[90%] h-2 animate-[pop-in_0.25s_ease-out_both]">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{ left: `${10 + i * 18}%`, top: '1px', background: PEPPER_COLORS[pepperId] }}
                />
              ))}
            </div>
          )}

          {has('tamarind') && (
            <div className="flex justify-center -mt-0.5 w-[76%] animate-[pop-in_0.25s_ease-out_both]">
              <div
                className="w-full rounded-full"
                style={{ height: 6, background: 'linear-gradient(90deg,#6b3f1d,#321d0b,#6b3f1d)' }}
              />
            </div>
          )}

          {toppings.length > 0 && (
            <div className="flex justify-center gap-1 -mt-0.5 w-[86%] py-0.5 overflow-hidden animate-[pop-in_0.25s_ease-out_both]">
              {toppings.map((t, i) => (
                <span key={i} className="text-sm leading-none">
                  {t === 'cucumber' ? '🥒' : '🌿'}
                </span>
              ))}
            </div>
          )}

          {baras >= 2 && <Bara lid />}
        </div>
      </div>
    </div>
  );
}