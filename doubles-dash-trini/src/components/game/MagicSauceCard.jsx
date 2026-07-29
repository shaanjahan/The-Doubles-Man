import React from 'react';
import { MAGIC_SAUCES, RARITY_STYLES } from '@/lib/gameData';
import { cn } from '@/lib/utils';
import SauceIcon from '@/components/SauceIcon';

export default function MagicSauceCard({ sauceId, equipped, owned, onToggle, compact }) {
  const sauce = MAGIC_SAUCES.find((s) => s.id === sauceId);
  if (!sauce) return null;
  const r = RARITY_STYLES[sauce.rarity];
  return (
    <button
      onClick={onToggle}
      disabled={!owned && !onToggle}
      className={cn(
        'no-tap-highlight relative text-left rounded-2xl border-2 p-3 transition-all w-full',
        r.bg, r.ring, 'ring-1',
        equipped ? 'scale-[1.02] ' + r.glow : (owned ? 'hover:scale-[1.02]' : 'opacity-50 grayscale'),
        onToggle && 'active:scale-95'
      )}
    >
      <div className="flex items-start gap-2">
        <SauceIcon sauce={sauce} sizeClass="w-9 h-9" emojiClass="text-2xl" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-heading font-bold text-sm text-foreground truncate">{sauce.name}</p>
            {equipped && <span className="text-[9px] bg-tropic-coral text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">EQUIPPED</span>}
          </div>
          {!compact && <p className={cn('text-[10px] font-semibold capitalize mt-0.5', r.label)}>{sauce.rarity}</p>}
          {!compact && <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{sauce.desc}</p>}
        </div>
      </div>
    </button>
  );
}