import React, { useState } from 'react';
import { Gift, X } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { DAILY_REWARDS, MAGIC_SAUCES } from '@/lib/game/catalog';
import SauceIcon from '@/components/SauceIcon';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyLoginModal() {
  const { player, claimDaily } = usePlayerState();
  const [closing, setClosing] = useState(false);
  if (!player) return null;
  if (player.lastDailyClaim === todayStr() || closing) return null;

  const claimableIdx = Math.min(player.dailyStreak, DAILY_REWARDS.length - 1);
  const streakIdx = Math.max(0, claimableIdx);

  async function handleClaim() {
    const r = await claimDaily();
    if (r) setClosing(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-[fadeIn_0.2s_easy-out]">
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
        <p className="text-xs text-zinc-400 mt-1">
          Day {claimableIdx + 1} of your streak. Come back tomorrow for the next reward.
        </p>

        <div className="grid grid-cols-4 gap-2 mt-3">
          {DAILY_REWARDS.map((r, i) => {
            const claimed = i < streakIdx;
            const isToday = i === claimableIdx;
            return (
              <div
                key={i}
                className={
                  'rounded-2xl border p-2 text-center ' +
                  (isToday
                    ? 'border-tropic-gold bg-tropic-gold/15 shadow-md'
                    : claimed
                    ? 'border-white/10 bg-white/5 opacity-70'
                    : 'border-white/10')
                }
              >
                <div className="text-[10px] text-zinc-400 font-bold">Day {i + 1}</div>
                {(() => {
                  const sauce = r.magicSauce ? MAGIC_SAUCES.find((x) => x.id === r.magicSauce) : null;
                  if (sauce) {
                    return <div className="mt-1 flex justify-center"><SauceIcon sauce={sauce} sizeClass="w-9 h-9" emojiClass="text-xl" /></div>;
                  }
                  return (
                    <div className="mt-1 flex justify-center items-center h-6">
                      {r.coins ? <CoinIcon className="h-5 w-5 inline-block" /> : r.gems ? <GemIcon className="h-5 w-5 inline-block" /> : <span className="text-xl">🎁</span>}
                    </div>
                  );
                })()}
                <div className="text-[10px] font-bold text-zinc-200">
                  {r.coins ? `+${r.coins}` : r.gems ? `+${r.gems}` : r.magicSauce ? '+1 Sauce' : '?'}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleClaim}
          className="mt-4 w-full bg-tropic-gold hover:brightness-110 text-amber-950 font-extrabold py-3 rounded-2xl shadow active:scale-95 transition"
        >
          Claim Day {claimableIdx + 1} Reward
        </button>
      </div>
    </div>
  );
}