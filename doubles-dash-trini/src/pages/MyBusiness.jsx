import React, { useState, useEffect } from 'react';
import { Image } from '@/components/ui/image';
import { usePlayerState } from '@/lib/game/PlayerContext';
import {
  BUSINESS_TIERS, businessCostFor, businessIncomePerMin, collectableCoins,
  businessPerRoundBonus, MAX_IDLE_MINUTES, idleCapForTier,
} from '@/lib/game/catalog';
import CoinIcon from '@/components/CoinIcon';
import { Store as StoreIcon, Lock, Loader2 } from 'lucide-react';

// businessTier is set by player level thresholds — used to tell players when a
// locked business type unlocks.
const UNLOCK_LEVEL = [1, 5, 9, 14, 19, 25, 32];

export default function MyBusiness() {
  const { player, manageBusiness } = usePlayerState();
  const [busy, setBusy] = useState(false);
  const [buyingTier, setBuyingTier] = useState(null);
  const [msg, setMsg] = useState(null);
  const [, setTick] = useState(0);

  // Re-render every second so the collectable idle total counts up live.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!player) return null;

  const businesses = player.businesses || [];
  const ownedCount = (tier) => businesses.find((b) => b.tier === tier)?.count || 0;
  const idleCap = idleCapForTier(player.businessTier);
  const collectable = collectableCoins(businesses, player.lastBusinessCollect, player.businessTier);
  const perMin = businessIncomePerMin(businesses);
  const perRound = businessPerRoundBonus(businesses);
  const maxStorable = Math.min(perMin * MAX_IDLE_MINUTES, idleCap);

  async function collect() {
    if (busy || collectable <= 0) return;
    setBusy(true); setMsg(null);
    const res = await manageBusiness('collect');
    setBusy(false);
    if (res?.collected != null) setMsg(res.collected > 0 ? `Collected ${res.collected} dollars!` : 'Nothing to collect yet.');
    else if (res?.error) setMsg(res.error);
  }

  async function buy(tier) {
    if (busy) return;
    setBusy(true); setBuyingTier(tier); setMsg(null);
    const res = await manageBusiness('buy', tier);
    setBusy(false); setBuyingTier(null);
    if (res?.error) setMsg(res.error);
  }

  return (
    <div className="max-w-2xl mx-auto px-3 pt-3 pb-6 space-y-4">
      <div className="flex items-center gap-2">
        <StoreIcon className="text-tropic-gold" size={24} />
        <h1 className="text-3xl font-extrabold text-tropic-coral tracking-wide">My Business</h1>
      </div>
      <p className="text-xs text-white/60">
        Own doubles bikes, stands, roti shops and more. They earn idle dollars over time — your per-collection cap rises with your rank (2,000 → 3,500 → 6,500 → 12,000 → 24,000), accrues up to 4h away, and each adds a bonus every round you play.
      </p>

      {/* Collect bar */}
      <section className="bg-tropic-carnival rounded-3xl p-4 shadow-lg text-foreground">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase font-extrabold opacity-80">Ready to collect</div>
            <div className="flex items-center gap-1.5 text-2xl font-extrabold">
              {collectable.toLocaleString()} <CoinIcon className="w-6 h-6" />
            </div>
            <div className="text-[11px] font-bold opacity-80">
              {perMin > 0 ? `+${perMin.toLocaleString()}/min income` : 'No businesses yet — buy your first below.'}
            </div>
          </div>
          <button
            onClick={collect}
            disabled={busy || collectable <= 0}
            className={`px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 transition ${collectable > 0 ? 'bg-white text-tropic-palm hover:scale-105 active:scale-95' : 'bg-white/30 cursor-not-allowed'}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Collect'}
          </button>
        </div>
        {perMin > 0 && (
          <div className="mt-3 h-2 rounded-full bg-black/20 overflow-hidden">
            <div className="h-full bg-white/90 rounded-full transition-all" style={{ width: `${Math.min(100, maxStorable > 0 ? (collectable / maxStorable) * 100 : 0)}%` }} />
          </div>
        )}
      </section>

      {msg && (
        <div className="text-[12px] font-bold text-tropic-gold bg-white/10 rounded-xl px-3 py-2 text-center">{msg}</div>
      )}

      {perRound > 0 && (
        <div className="text-[12px] text-white/70 text-center">
          Each round also pays a <span className="text-tropic-gold font-bold">+{perRound.toLocaleString()}</span> business bonus.
        </div>
      )}

      {/* Business catalog */}
      <section className="space-y-3">
        {BUSINESS_TIERS.map((biz) => {
          const owned = ownedCount(biz.id);
          const unlocked = (player.businessTier || 0) >= biz.id;
          const cost = businessCostFor(biz.id, owned);
          const afford = (player.coins || 0) >= cost;
          const unitIncome = biz.incomePerMin;
          return (
            <div key={biz.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${unlocked ? 'bg-white/95 border-amber-100' : 'bg-white/5 border-white/10 opacity-80'}`}>
              <Image src={biz.image} fittingType="fit" alt={biz.name} className="w-14 h-14 rounded-xl bg-amber-50 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-800 text-sm">{biz.name}</span>
                  {owned > 0 && <span className="text-[10px] font-bold px-1.5 rounded-full bg-tropic-sea text-white">×{owned}</span>}
                </div>
                <div className="text-[11px] text-slate-600">
                  {unlocked ? `Each earns ${unitIncome.toLocaleString()}/min idle · +${biz.perRound} per round` : `Unlocks at Level ${UNLOCK_LEVEL[biz.id] ?? '?'}`}
                </div>
                {owned > 0 && (
                  <div className="text-[10px] text-slate-500 mt-0.5">Owned income: {(unitIncome * owned).toLocaleString()}/min</div>
                )}
              </div>
              {unlocked ? (
                <button
                  onClick={() => buy(biz.id)}
                  disabled={busy || !afford}
                  className={`flex flex-col items-end justify-center gap-0.5 px-3 py-2 rounded-2xl text-xs font-extrabold transition shrink-0 ${afford ? 'bg-tropic-magenta text-white hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  {buyingTier === biz.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="flex items-center gap-1"><CoinIcon className="w-3.5 h-3.5" /> {cost.toLocaleString()}</span>
                      <span>Buy</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-0.5 px-3 py-2 text-slate-400 shrink-0">
                  <Lock size={18} />
                  <span className="text-[10px] font-bold">Locked</span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="text-[11px] text-white/50 text-center pt-1">
        Costs rise as you buy more. Idle income accrues up to 4h and is capped at {idleCap.toLocaleString()} dollars per collection.
      </div>
    </div>
  );
}