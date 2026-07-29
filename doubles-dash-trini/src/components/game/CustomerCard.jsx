import React from 'react';
import OrderBubble from './OrderBubble';
import { cn } from '@/lib/utils';

export default function CustomerCard({ customer, isServing }) {
  const { typeDef, patience } = customer;
  const patienceHue = patience > 50 ? 150 : patience > 25 ? 39 : 0;
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1 transition-all duration-300',
        isServing && 'scale-110',
        customer.leaving && 'animate-slide-out-left'
      )}
    >
      <div
        className={cn(
          'relative w-16 h-16 rounded-full grid place-items-center text-3xl shadow-lg border-2 bg-card',
          isServing ? 'border-tropic-coral ring-4 ring-tropic-coral/30 -translate-y-1' : 'border-border',
          customer.vip && 'border-tropic-gold ring-4 ring-tropic-gold/30'
        )}
        style={{ animation: 'float-soft 3s ease-in-out infinite' }}
      >
        <span>{typeDef.emoji}</span>
        {customer.vip && (
          <span className="absolute -top-2 -right-1 text-xs bg-tropic-gold rounded-full px-1 py-0.5 font-bold text-white shadow">VIP</span>
        )}
      </div>
      <div className="bg-card/95 backdrop-blur rounded-2xl px-2 py-1.5 shadow-md border border-border/70 -mt-1">
        <OrderBubble order={customer.order} />
      </div>
      <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${Math.max(0, patience)}%`, backgroundColor: `hsl(${patienceHue} 70% 45%)` }}
        />
      </div>
    </div>
  );
}