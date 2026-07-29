import React from 'react';
import OrderBubble from './OrderBubble';
import { Image } from '@/components/ui/image';

export default function Customer({ customer, slotIndex }) {
  const c = customer;
  const pct = Math.max(0, (c.patience / c.maxPatience) * 100);
  const barColor = pct > 50 ? 'bg-tropic-sea' : pct > 25 ? 'bg-tropic-gold' : 'bg-tropic-coral';
  const wobble = pct < 25 ? 'animate-[shake-soft_0.5s_ease-in-out_infinite]' : '';
  return (
    <div className="flex flex-col items-center w-full h-full min-h-0 px-0.5 animate-[slide-in-right_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]">
      <OrderBubble order={c.order} />
      <div className={`relative w-full flex-1 min-h-0 rounded-xl overflow-hidden ring-2 ${c.challenge ? 'ring-tropic-coral' : 'ring-white/10'} ${wobble}`}>
        {c.challenge && (
          <div className="absolute top-1 left-1 z-10 bg-tropic-coral text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow whitespace-nowrap">⚠ CHALLENGE</div>
        )}
        {c.type.image ? (
          <Image
            src={c.type.image}
            alt={c.type.name}
            fittingType="fill"
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">{c.type.emoji}</div>
        )}
      </div>
      <div className="w-full mt-0.5 h-1.5 rounded-full bg-white/15 overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-100`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}