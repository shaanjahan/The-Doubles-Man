import React from 'react';
import { Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LocationCard({ location, unlocked, active, onClick, stars }) {
  return (
    <button
      onClick={onClick}
      disabled={!unlocked}
      className={cn(
        'no-tap-highlight relative overflow-hidden rounded-3xl p-4 text-left border-2 transition-all w-full',
        unlocked ? 'border-border/70 bg-card hover:border-tropic-sea active:scale-[0.98] shadow-sm' : 'border-border/50 bg-muted/60',
        active && 'border-tropic-coral ring-2 ring-tropic-coral/40'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-14 h-14 rounded-2xl grid place-items-center text-3xl shrink-0', unlocked ? 'bg-tropic-sea/15' : 'bg-muted')}>
          {unlocked ? location.emoji : <Lock className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading font-bold text-foreground truncate">{location.name}</p>
          <p className="text-[11px] text-muted-foreground font-semibold truncate">{location.city}</p>
          {!unlocked ? (
            <p className="text-[10px] text-muted-foreground mt-1">Unlock at Lv {location.unlockLevel}</p>
          ) : (
            <div className="flex items-center gap-0.5 mt-1">
              {[0, 1, 2].map((i) => (
                <Star key={i} className={cn('w-3.5 h-3.5', i < stars ? 'fill-tropic-gold text-tropic-gold' : 'text-border')} />
              ))}
            </div>
          )}
        </div>
      </div>
      {active && (
        <div className="absolute top-2 right-2 text-[9px] bg-tropic-coral text-white px-2 py-0.5 rounded-full font-bold">ACTIVE</div>
      )}
    </button>
  );
}