import React from 'react';
import { Link } from 'react-router-dom';
import { Play as PlayIcon } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { useRefreshHandler } from '@/lib/game/RefreshContext';
import { BUSINESS_TIERS, LOCATIONS, tierByIndex } from '@/lib/game/catalog';
import DailyLoginModal from '@/components/DailyLoginModal';
import { Image } from '@/components/ui/image';
import ProfileSection from '@/components/game/ProfileSection';
import HowToPlayButton from '@/components/game/HowToPlayButton';

const HUB_BG = 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/0d9719541_1336D320-FC46-4E41-BD87-2AACAC7E4A74.png';

function QuickLink({ to, label, emoji }) {
  return (
    <Link to={to} className="bg-fire-tile rounded-2xl p-3 shadow border border-white/10 text-center hover:scale-[1.03] active:scale-95 transition">
      <div className="text-3xl">{emoji}</div>
      <div className="text-xs font-bold text-foreground/90 mt-1">{label}</div>
    </Link>
  );
}

export default function Home() {
  const { player, reload } = usePlayerState();
  useRefreshHandler('/home', reload);
  if (!player) return <div className="px-4 pt-6 text-white/60">Loading hub…</div>;

  const tier = tierByIndex(player.businessTier);
  const nextTier = BUSINESS_TIERS[player.businessTier + 1];
  const TIER_LEVELS = [1, 5, 14, 25, 32];
  const curTierLvl = TIER_LEVELS[player.businessTier] || 1;
  const nextTierLvl = TIER_LEVELS[Math.min(TIER_LEVELS.length - 1, player.businessTier + 1)] || 60;
  const tierPct = nextTier ? Math.min(100, Math.max(0, ((player.level - curTierLvl) / (nextTierLvl - curTierLvl)) * 100)) : 100;
  const loc = LOCATIONS[player.currentLocationId] || LOCATIONS[0];

  return (
    <div className="relative max-w-2xl mx-auto px-3 pt-3 pb-6 space-y-4">
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <Image
          src={HUB_BG}
          alt="Tropical sunset promenade"
          className="absolute inset-0 w-full h-full object-cover"
          fittingType="fill"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/65 to-black/80" />
      </div>
      <DailyLoginModal />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-tropic-carnival text-white p-5 shadow-xl animate-[pop-in_0.55s_ease-out_both]">
        {tier.image ? (
          <div className="absolute right-4 top-4 select-none animate-[float-soft_4.5s_ease-in-out_infinite]">
            <Image src={tier.image} alt={tier.name} className="w-20 h-20 rounded-full object-cover ring-4 ring-tropic-gold shadow-[0_6px_16px_rgba(0,0,0,0.45)]" fittingType="fill" />
          </div>
        ) : (
          <div className="absolute -right-6 -top-8 text-9xl opacity-20 select-none animate-[float-soft_4.5s_ease-in-out_infinite]">{tier.emoji}</div>
        )}
        <div className="relative">
          <div className="text-[11px] uppercase font-bold tracking-wider text-white/80">
            {tier.emoji} {tier.name}
          </div>
          <h1 className="text-2xl font-extrabold mt-0.5">Aye, {player.displayName}!</h1>
          <p className="text-white/85 text-sm mt-1">The streets are hungry. Time to make doubles.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="bg-white/20 rounded-full px-2.5 py-1">{loc.emoji} {loc.name}</span>
            <span className="bg-white/20 rounded-full px-2.5 py-1">Lvl {player.level}</span>
            <span className="bg-white/20 rounded-full px-2.5 py-1">🔥 Streak {player.dailyStreak || 0}</span>
          </div>
          <Link
            to="/play"
            className="mt-4 inline-flex items-center gap-2 bg-tropic-gold text-black font-extrabold px-5 py-2.5 rounded-full shadow hover:scale-110 active:scale-95 transition animate-[wiggle_2.5s_ease-in-out_infinite]"
          >
            <PlayIcon size={18} /> Start Serving
          </Link>
        </div>

        <HowToPlayButton />
      </section>

      {/* Empire progression */}
      <section className="bg-fire-tile rounded-3xl p-4 shadow border border-white/10 animate-[pop-in_0.6s_ease-out_both]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase font-extrabold text-tropic-gold tracking-wide">Your Empire</div>
            <div className="font-bold text-foreground">{tier.name}</div>
          </div>
          {nextTier ? (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">Next: {nextTier.name}</div>
              <div className="w-28 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-tropic-gold" style={{ width: `${tierPct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Lvl {curTierLvl} → {nextTierLvl}</div>
            </div>
          ) : (
            <span className="text-xs font-bold text-black bg-tropic-gold px-2 py-1 rounded-full">Top Tier!</span>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {BUSINESS_TIERS.map((t) => {
            const reached = t.id <= player.businessTier;
            return (
              <div key={t.id} className={`shrink-0 rounded-2xl px-2.5 py-2 text-center text-[10px] font-bold ${reached ? 'bg-tropic-gold/20 text-tropic-gold' : 'bg-white/5 text-white/40'}`}>
                {t.image ? (
                  <Image src={t.image} alt={t.name} className="w-8 h-8 mx-auto rounded-full object-cover ring-2 ring-tropic-gold mb-1" fittingType="fill" />
                ) : (
                  <div className="text-lg">{t.emoji}</div>
                )}
                <div className="max-w-[64px]">{t.name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Profile details */}
      <ProfileSection />

      {/* Quick links */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-[pop-in_0.75s_ease-out_both]">
        {[
          { to: '/upgrades', label: 'Upgrade' },
          { to: '/business', label: 'My Biz' },
          { to: '/leaderboard', label: 'Leaderboards' },
          { to: '/store', label: 'Store' },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="bg-fire-tile rounded-2xl px-2 py-3 shadow border border-white/10 text-center hover:scale-[1.03] active:scale-95 transition">
            <div className="font-heading text-tropic-gold text-xl leading-tight text-shadow-soft">{q.label}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}