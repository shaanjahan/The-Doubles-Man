import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/lib/usePlayer';
import { MAGIC_SAUCES, BUSINESS_TIERS, RARITY_STYLES } from '@/lib/gameData';
import PlayerHeader from '@/components/game/PlayerHeader';
import BottomNav from '@/components/game/BottomNav';
import { cn } from '@/lib/utils';
import { Plus, Sparkles } from 'lucide-react';

const SLOTS = 2;

export default function Inventory() {
  const navigate = useNavigate();
  const { profile, save } = usePlayer();

  // Give every player a starter set of owned sauces if they have none
  const ownedSet = useMemo(() => new Set(profile.ownedSauces?.length ? profile.ownedSauces : ['lucky_sauce', 'sweet_beni']), [profile.ownedSauces]);
  const equipped = profile.equippedSauces || [];

  const toggleEquip = (sauceId) => {
    if (!ownedSet.has(sauceId)) return;
    let next = [...equipped];
    if (next.includes(sauceId)) {
      next = next.filter((s) => s !== sauceId);
    } else if (next.length < SLOTS) {
      next.push(sauceId);
    } else {
      // replace first
      next = [next[1], sauceId];
    }
    save({ equippedSauces: next });
  };

  const buySauce = (sauceId) => {
    if (ownedSet.has(sauceId)) return;
    if (profile.gems < 5) return;
    save({ gems: profile.gems - 5, ownedSauces: [...(profile.ownedSauces || []), sauceId] });
  };

  return (
    <div className="min-h-screen pb-24 bg-background max-w-md mx-auto">
      <PlayerHeader profile={profile} level={`${SLOTS} equip slots`} xpProgress={50} />
      <div className="px-4 mt-2">
        <h1 className="font-heading font-extrabold text-2xl text-foreground">Magic Sauces</h1>
        <p className="text-xs text-muted-foreground font-semibold mt-1">Equip up to {SLOTS} power-ups before you start a round.</p>
      </div>

      {/* Equipped slots */}
      <div className="px-4 mt-3 flex gap-2">
        {Array.from({ length: SLOTS }).map((_, i) => {
          const id = equipped[i];
          const sauce = MAGIC_SAUCES.find((s) => s.id === id);
          const r = sauce ? RARITY_STYLES[sauce.rarity] : null;
          return (
            <div key={i} className={cn('flex-1 rounded-2xl border-2 border-dashed p-3 min-h-[68px] grid place-items-center text-center', sauce ? cn(r.bg, r.ring, 'ring-1 border-solid', r.glow) : 'border-border/70 bg-muted/50')}>
              {sauce ? (
                <div className="flex items-center gap-2 justify-center w-full">
                  <span className="text-2xl">{sauce.emoji}</span>
                  <div className="text-left min-w-0">
                    <p className="font-heading font-bold text-xs text-foreground truncate">{sauce.name}</p>
                    <p className={cn('text-[9px] font-bold capitalize', r.label)}>{sauce.rarity}</p>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  <Plus className="w-5 h-5 mx-auto" />
                  <p className="text-[10px] font-bold mt-0.5">Empty Slot</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Collection */}
      <div className="px-4 mt-4">
        <h3 className="font-heading font-bold text-sm text-foreground mb-2 flex items-center gap-1"><Sparkles className="w-4 h-4 text-tropic-gold" /> Your Collection</h3>
        <div className="grid grid-cols-1 gap-2">
          {MAGIC_SAUCES.map((sauce) => {
            const owned = ownedSet.has(sauce.id);
            const isEquipped = equipped.includes(sauce.id);
            return (
              <div key={sauce.id} className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card overflow-hidden">
                <div className="flex-1">
                  <div className={cn('p-3', owned ? RARITY_STYLES[sauce.rarity].bg : 'bg-muted/50')}>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-2xl', !owned && 'opacity-30 grayscale')}>{sauce.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading font-bold text-sm text-foreground truncate">{sauce.name}</p>
                        <p className={cn('text-[9px] font-bold capitalize', owned ? RARITY_STYLES[sauce.rarity].label : 'text-muted-foreground')}>{sauce.rarity}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{sauce.desc}</p>
                  </div>
                </div>
                <div className="p-2 shrink-0">
                  {owned ? (
                    <button
                      onClick={() => toggleEquip(sauce.id)}
                      className={cn('no-tap-highlight rounded-xl px-3 py-2 font-heading font-bold text-xs transition active:scale-90', isEquipped ? 'bg-tropic-coral text-white' : 'bg-tropic-sea/15 text-tropic-teal')}
                    >{isEquipped ? 'Unequip' : 'Equip'}</button>
                  ) : (
                    <button
                      onClick={() => buySauce(sauce.id)}
                      disabled={profile.gems < 5}
                      className={cn('no-tap-highlight rounded-xl px-3 py-2 font-heading font-bold text-xs transition active:scale-90', profile.gems >= 5 ? 'bg-tropic-gold text-white' : 'bg-muted text-muted-foreground')}
                    >💎 5</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}