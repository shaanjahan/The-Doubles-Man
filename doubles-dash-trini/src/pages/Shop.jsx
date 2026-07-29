import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/lib/usePlayer';
import { UPGRADES, BUSINESS_TIERS, upgradeCost } from '@/lib/gameData';
import PlayerHeader from '@/components/game/PlayerHeader';
import BottomNav from '@/components/game/BottomNav';
import { cn } from '@/lib/utils';
import { Check, Lock } from 'lucide-react';

export default function Shop() {
  const navigate = useNavigate();
  const { profile, save } = usePlayer();
  const [tab, setTab] = useState('upgrades');

  const buyUpgrade = (upg) => {
    const lvl = profile.upgrades[upg.id] || 0;
    if (lvl >= upg.max) return;
    const cost = upgradeCost(upg.baseCost, lvl);
    if (profile.coins < cost) return;
    save({ coins: profile.coins - cost, upgrades: { [upg.id]: lvl + 1 } });
  };

  const buyTier = () => {
    const tier = BUSINESS_TIERS[profile.businessTier] || BUSINESS_TIERS[0];
    if (profile.businessTier >= BUSINESS_TIERS.length - 1) return;
    const nextTier = BUSINESS_TIERS[profile.businessTier + 1];
    if (profile.coins < nextTier.cost) return;
    save({ coins: profile.coins - nextTier.cost, businessTier: profile.businessTier + 1 });
  };

  return (
    <div className="min-h-screen pb-24 bg-background max-w-md mx-auto">
      <PlayerHeader profile={profile} level={`${profile.coins.toLocaleString()} coins`} xpProgress={50} />
      <div className="px-4 mt-2">
        <h1 className="font-heading font-extrabold text-2xl text-foreground">Upgrade Shop</h1>
        <div className="flex gap-2 mt-3 p-1 bg-muted rounded-2xl">
          <TabBtn active={tab === 'upgrades'} onClick={() => setTab('upgrades')}>Equipment</TabBtn>
          <TabBtn active={tab === 'business'} onClick={() => setTab('business')}>Business</TabBtn>
        </div>
      </div>

      {tab === 'upgrades' && (
        <div className="px-4 mt-3 space-y-2">
          {UPGRADES.map((upg) => {
            const lvl = profile.upgrades[upg.id] || 0;
            const maxed = lvl >= upg.max;
            const cost = upgradeCost(upg.baseCost, lvl);
            const affordable = profile.coins >= cost && !maxed;
            return (
              <div key={upg.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
                <div className="w-12 h-12 rounded-2xl bg-tropic-sand/60 grid place-items-center text-2xl shrink-0">{upg.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-bold text-sm text-foreground">{upg.name}</p>
                    <span className="text-[10px] font-bold text-tropic-teal bg-tropic-sea/10 px-1.5 py-0.5 rounded-full">Lv {lvl}/{upg.max}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-snug">{upg.desc}</p>
                  <p className="text-[11px] font-bold text-tropic-green mt-0.5">{upg.effect(Math.max(lvl, 1))}</p>
                </div>
                <button
                  onClick={() => buyUpgrade(upg)}
                  disabled={!affordable}
                  className={cn(
                    'no-tap-highlight shrink-0 rounded-2xl px-3 py-2 font-heading font-bold text-xs transition active:scale-90',
                    maxed ? 'bg-tropic-green/15 text-tropic-green' : affordable ? 'bg-tropic-coral text-white shadow' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {maxed ? <Check className="w-4 h-4" /> : `🪙 ${cost}`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'business' && (
        <div className="px-4 mt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Upgrade your stand to attract more customers and grow your empire.</p>
          {BUSINESS_TIERS.map((t, i) => {
            const owned = profile.businessTier >= t.tier;
            const isNext = profile.businessTier + 1 === t.tier;
            const affordable = profile.coins >= t.cost;
            return (
              <div key={t.tier} className={cn('flex items-center gap-3 rounded-2xl border-2 p-3', owned ? 'border-tropic-green/50 bg-tropic-green/5' : 'border-border/70 bg-card')}>
                <div className="w-12 h-12 rounded-2xl bg-tropic-sea/15 grid place-items-center text-2xl shrink-0">{owned ? t.emoji : i > profile.businessTier ? '🔒' : t.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground font-semibold">Tier {t.tier + 1} business</p>
                </div>
                {owned ? (
                  <span className="text-xs font-bold text-tropic-green bg-tropic-green/15 px-2.5 py-1.5 rounded-full flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Owned</span>
                ) : isNext ? (
                  <button
                    onClick={buyTier}
                    disabled={!affordable}
                    className={cn('no-tap-highlight rounded-2xl px-3 py-2 font-heading font-bold text-xs transition active:scale-90', affordable ? 'bg-tropic-coral text-white shadow' : 'bg-muted text-muted-foreground')}
                  >🪙 {t.cost.toLocaleString()}</button>
                ) : (
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      <BottomNav />
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={cn('no-tap-highlight flex-1 py-2 rounded-xl font-heading font-bold text-sm transition', active ? 'bg-card text-tropic-coral shadow' : 'text-muted-foreground')}>{children}</button>
  );
}