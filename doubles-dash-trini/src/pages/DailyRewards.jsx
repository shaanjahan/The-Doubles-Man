import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/lib/usePlayer';
import { base44 } from '@/api/base44Client';
import { DAILY_REWARDS, MAGIC_SAUCES } from '@/lib/gameData';
import BottomNav from '@/components/game/BottomNav';
import PlayerHeader from '@/components/game/PlayerHeader';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft } from 'lucide-react';

export default function DailyRewards() {
  const navigate = useNavigate();
  const { profile, save } = usePlayer();
  const [claiming, setClaiming] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = profile.streakLastDate === today;
  const streak = profile.streakCount || 0;
  // day in cycle 1..7; if claimed today, show current streak day as done
  const currentDay = claimedToday ? (streak === 0 ? 1 : streak) : streak + 1;
  const claimDay = Math.min(claimedToday ? streak : streak + 1, 7);

  // Claim is validated server-side (claim-daily-reward) so the streak/eligibility
  // and reward tier can't be bypassed from the client. We refresh local state
  // from the authoritative result.
  const claim = async () => {
    if (claimedToday || claiming) return;
    setClaiming(true);
    try {
      const res = await base44.functions.invoke('claim-daily-reward');
      if (res?.data?.profile) save(res.data.profile);
    } catch {
      /* eligibility is enforced server-side; ignore client-side errors */
    } finally {
      setTimeout(() => setClaiming(false), 600);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background max-w-md mx-auto">
      <UserHeaderless profile={profile} navigate={navigate} />
      <div className="px-4 mt-2">
        <h1 className="font-heading font-extrabold text-2xl text-foreground">Daily Login Rewards</h1>
        <p className="text-xs text-muted-foreground font-semibold mt-1">Come back every day to keep your streak alive and earn bigger prizes! 🔥</p>
      </div>

      <div className="px-4 mt-3 rounded-3xl bg-tropic-sunset text-white p-4 text-center shadow-lg">
        <p className="text-3xl font-heading font-extrabold">{claimedToday ? streak : streak + 1}🔥</p>
        <p className="text-sm font-bold text-white/90">{claimedToday ? "Day claimed — see you tomorrow!" : "Claim today's reward!"}</p>
      </div>

      <div className="px-4 mt-4 space-y-2">
        {DAILY_REWARDS.map((dr, i) => {
          const isPast = i + 1 < currentDay;
          const isToday = i + 1 === currentDay && !claimedToday;
          const isClaimed = !isPast && i + 1 < (claimedToday ? streak + 1 : streak + 1) || (claimedToday && i + 1 <= streak);
          return (
            <div key={dr.day} className={cn('flex items-center gap-3 rounded-2xl border-2 p-3 transition', isClaimed ? 'border-tropic-green/50 bg-tropic-green/5' : isToday ? 'border-tropic-coral bg-tropic-coral/10 animate-wiggle' : 'border-border/70 bg-card')}>
              <div className={cn('w-9 h-9 rounded-xl grid place-items-center font-heading font-extrabold text-sm shrink-0', isClaimed ? 'bg-tropic-green/15 text-tropic-green' : isToday ? 'bg-tropic-coral text-white' : 'bg-muted text-muted-foreground')}>
                {isClaimed ? <Check className="w-5 h-5" /> : `D${dr.day}`}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <RewardIcon reward={dr.reward} />
                <p className="font-heading font-bold text-sm text-foreground">{rewardLabel(dr.reward)}</p>
              </div>
              {isToday && !claimedToday && (
                <button onClick={claim} disabled={claiming} className="no-tap-highlight rounded-xl bg-tropic-coral text-white font-heading font-bold text-xs px-3 py-2 active:scale-90 transition shadow">Claim</button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}

function UserHeaderless({ profile, navigate }) {
  return (
    <div className="px-4 pt-4 pb-2 flex items-center gap-2">
      <button onClick={() => navigate('/')} className="no-tap-highlight w-9 h-9 rounded-xl bg-card border border-border/70 grid place-items-center active:scale-90">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div>
        <p className="font-heading font-bold text-sm">Daily Rewards</p>
        <p className="text-[11px] text-muted-foreground font-semibold">Streak Day {profile.streakCount || 0}</p>
      </div>
    </div>
  );
}

function RewardIcon({ reward }) {
  if (reward.type === 'coins') return <span className="text-2xl">🪙</span>;
  if (reward.type === 'gems') return <span className="text-2xl">💎</span>;
  if (reward.type === 'sauce') {
    const s = MAGIC_SAUCES.find((x) => x.id === reward.sauceId);
    return <span className="text-2xl">{s?.emoji || '✨'}</span>;
  }
  return <span className="text-2xl">🎁</span>;
}

function rewardLabel(r) {
  if (r.type === 'coins') return `${r.amount.toLocaleString()} Coins`;
  if (r.type === 'gems') return `${r.amount} Gems`;
  if (r.type === 'sauce') { const s = MAGIC_SAUCES.find((x) => x.id === r.sauceId); return s ? `${s.name} Sauce` : 'Magic Sauce'; }
  if (r.type === 'mystery') return `Mystery Box (${r.amount.toLocaleString()} coins!)`;
  return 'Reward';
}