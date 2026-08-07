import React, { useState } from 'react';
import { Gift, X } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import {
  DAILY_REWARDS, MAGIC_SAUCES, STREAK_MILESTONES,
  STREAK_REPAIR_COST, STREAK_REPAIR_MIN,
  rewardDayForStreak, trinidadDayStr,
} from '@/lib/game/catalog';
import SauceIcon from '@/components/SauceIcon';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';
import { IconGift, IconFlame } from '@/components/game/art/icons';

// Compact reward label for a calendar cell: "+7.5K" coins / "+40" gems / "+1" sauce.
function fmtCoins(n) {
  return n >= 1000 ? `${n % 1000 === 0 ? n / 1000 : (n / 1000).toFixed(1)}K` : `${n}`;
}

// 30-day streak calendar. The strip shows TODAY plus the six days coming so a
// player can see exactly what a broken streak would cost. Streak days roll at
// midnight Trinidad time (trinidadDayStr), matching claim-daily's server day.
export default function DailyLoginModal() {
  const { player, claimDaily } = usePlayerState();
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  if (!player) return null;

  const today = trinidadDayStr();
  // '>=' mirrors the server's transition guard (a UTC-era claim can sit one
  // day ahead of the Trinidad date).
  if ((player.lastDailyClaim || '') >= today || closing) return null;

  const streak = player.dailyStreak || 0;
  const continuing = player.lastDailyClaim === trinidadDayStr(-1);
  const repairable = player.lastDailyClaim === trinidadDayStr(-2) && streak >= STREAK_REPAIR_MIN;
  const streakLost = !!player.lastDailyClaim && !continuing && !repairable && streak > 0;
  const canAffordRepair = (player.gems || 0) >= STREAK_REPAIR_COST;

  // Preview the best available path: continuing (or repaired) streak, else day 1.
  const nextStreak = continuing || repairable ? streak + 1 : 1;

  async function handleClaim(repair = false) {
    if (busy) return;
    setBusy(true); setErr(null);
    const r = await claimDaily({ repair });
    setBusy(false);
    if (r && !r.error) { setClosing(true); return; }
    const msg = r?.error || '';
    if (msg.includes('Already claimed')) { setClosing(true); return; }
    if (msg === 'not_enough_gems') setErr('Not enough gems to repair — starting fresh is free.');
    else if (msg === 'repair_unavailable') setErr("Repair isn't available for this gap — claim to start fresh.");
    else setErr('Something went wrong — try again.');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center px-4 pt-[max(3.5rem,calc(env(safe-area-inset-top)+1.25rem))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-[fadeIn_0.2s_easy-out]">
      <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-sm w-full p-5 border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-tropic-coral" size={22} />
            <h2 className="font-extrabold text-lg text-zinc-100">Daily Vendor Reward</h2>
          </div>
          <button onClick={() => setClosing(true)} className="p-1 hover:bg-white/10 rounded-full text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-zinc-400">
            {nextStreak <= DAILY_REWARDS.length
              ? <>Day <span className="text-tropic-gold font-extrabold">{nextStreak}</span> of {DAILY_REWARDS.length}</>
              : <>Day <span className="text-tropic-gold font-extrabold">{nextStreak}</span> — Legend Loop</>}
          </p>
          {(continuing || repairable) && streak > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-extrabold text-tropic-coral">
              <IconFlame size={14} /> {streak}-day streak
            </span>
          )}
        </div>

        {streakLost && (
          <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-2.5 text-[11px] text-zinc-300">
            Yuh streak reset — too many days missed. Back to Day 1!
          </div>
        )}

        {/* Today + the six days ahead: what you keep by coming back. */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {Array.from({ length: 7 }, (_, i) => {
            const sVal = nextStreak + i;
            const day = rewardDayForStreak(sVal);
            const r = DAILY_REWARDS[day - 1];
            const isToday = i === 0;
            const milestone = STREAK_MILESTONES.includes(day);
            const sauce = r.magicSauce ? MAGIC_SAUCES.find((x) => x.id === r.magicSauce) : null;
            return (
              <div
                key={i}
                className={
                  'rounded-2xl border p-2 text-center ' +
                  (isToday
                    ? 'border-tropic-gold bg-tropic-gold/15 shadow-md'
                    : milestone
                    ? 'border-tropic-gold/50 bg-tropic-gold/5'
                    : 'border-white/10')
                }
              >
                <div className={`text-[10px] font-bold ${milestone ? 'text-tropic-gold' : 'text-zinc-400'}`}>
                  {isToday ? 'Today' : `Day ${sVal}`}
                </div>
                <div className="mt-1 flex justify-center items-center h-9">
                  {sauce
                    ? <SauceIcon sauce={sauce} sizeClass="w-9 h-9" emojiClass="text-xl" />
                    : r.coins
                    ? <CoinIcon className="h-6 w-6 inline-block" />
                    : r.gems
                    ? <GemIcon className="h-6 w-6 inline-block" />
                    : <IconGift size={22} />}
                </div>
                <div className="text-[10px] font-bold text-zinc-200 flex items-center justify-center gap-0.5 flex-wrap">
                  {r.coins ? <span className="flex items-center gap-0.5">+{fmtCoins(r.coins)}<CoinIcon className="w-3 h-3" /></span> : null}
                  {r.gems ? <span className="flex items-center gap-0.5">+{r.gems}<GemIcon className="w-3 h-3" /></span> : null}
                  {!r.coins && !r.gems && sauce ? '+1' : null}
                </div>
              </div>
            );
          })}
        </div>

        {nextStreak < 30 && (
          <p className="mt-2 text-[10px] text-zinc-500 text-center flex items-center justify-center gap-1">
            Day 30: +100<GemIcon className="w-3 h-3" /> and the Legendary Double Trouble sauce
          </p>
        )}

        {err && (
          <div className="mt-2 text-[11px] font-bold text-tropic-coral text-center">{err}</div>
        )}

        {repairable ? (
          <div className="mt-3 space-y-2">
            <div className="rounded-2xl border border-tropic-gold/40 bg-tropic-gold/10 p-3">
              <div className="text-xs font-extrabold text-tropic-gold">Yuh missed a day!</div>
              <div className="text-[11px] text-zinc-300 mt-0.5">
                Repair yuh {streak}-day streak and keep climbing, or start fresh at Day 1.
              </div>
            </div>
            <button
              onClick={() => handleClaim(true)}
              disabled={busy || !canAffordRepair}
              className={`w-full font-extrabold py-3 rounded-2xl shadow transition flex items-center justify-center gap-1.5 ${canAffordRepair ? 'bg-tropic-gold hover:brightness-110 text-amber-950 active:scale-95' : 'bg-white/10 text-zinc-500 cursor-not-allowed'}`}
            >
              Repair for {STREAK_REPAIR_COST}<GemIcon className="w-4 h-4" /> · Claim Day {streak + 1}
            </button>
            {!canAffordRepair && (
              <p className="text-[10px] text-zinc-500 text-center">
                Yuh have {player.gems || 0} gems — need {STREAK_REPAIR_COST} to repair.
              </p>
            )}
            <button
              onClick={() => handleClaim(false)}
              disabled={busy}
              className="w-full py-2.5 rounded-2xl border border-white/15 text-zinc-300 font-bold text-sm hover:bg-white/5 active:scale-95 transition"
            >
              Start over — claim Day 1
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleClaim(false)}
            disabled={busy}
            className="mt-4 w-full bg-tropic-gold hover:brightness-110 text-amber-950 font-extrabold py-3 rounded-2xl shadow active:scale-95 transition"
          >
            {busy ? 'Claiming…' : `Claim Day ${nextStreak} Reward`}
          </button>
        )}
      </div>
    </div>
  );
}
