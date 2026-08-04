import React from 'react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { ACHIEVEMENTS, ACH_TIER_META, tierByIndex } from '@/lib/game/catalog';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';
import { AchIcon, IconCrown, IconFlame } from '@/components/game/art/icons';
import { CHARACTERS } from '@/lib/game/characters';
import PlayerAvatar from '@/components/PlayerAvatar';
import { Image } from '@/components/ui/image';
import AccountDialog from '@/components/AccountDialog';

// Everything that used to live on the standalone Profile page, now rendered on
// the hub: vendor card, character picker, full stat grid and achievements.

function fmtShort(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function StatBox({ label, value }) {
  return (
    <div className="bg-tropic-coral rounded-2xl p-3 border border-red-700 shadow-sm text-center">
      <div className="font-heading text-2xl text-yellow-300 leading-none">{value}</div>
      <div className="text-[10px] uppercase font-bold text-yellow-100/90 mt-1">{label}</div>
    </div>
  );
}

export default function ProfileSection() {
  const { player, setAvatar } = usePlayerState();
  if (!player) return null;
  const stats = player.stats || {};

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-extrabold text-tropic-coral tracking-wide">Vendor Profile</h2>
        <AccountDialog />
      </div>

      <div className="bg-white rounded-3xl p-4 shadow border border-amber-100 flex items-center gap-3">
        <PlayerAvatar avatarEmoji={player.avatarEmoji} sizeClass="w-16 h-16" emojiClass="text-4xl" />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-lg text-slate-800 truncate">
            {player.displayName}
            {(player.upgrades?.legacy || 0) > 0 && (
              <span className="ml-1.5 align-middle text-[11px] font-extrabold text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5 whitespace-nowrap inline-flex items-center gap-0.5"><IconCrown size={11} /> Legacy {player.upgrades.legacy}</span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-bold">Level {player.level} · {tierByIndex(player.businessTier).name}</div>
          <div className="text-[10px] text-amber-700 font-bold mt-0.5 inline-flex items-center gap-1"><IconFlame size={11} /> Daily streak: {player.dailyStreak || 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-3 shadow border border-amber-100">
        <div className="text-[11px] uppercase font-extrabold text-amber-700 px-2">Your Character</div>
        <div className="flex flex-wrap gap-3 mt-2">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => setAvatar(c.image)}
              className={`rounded-2xl p-1.5 transition ${player.avatarEmoji === c.image ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-slate-50 hover:bg-slate-100'}`}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden">
                <Image src={c.image} alt={c.label} fittingType="fill" className="w-full h-full" />
              </div>
              <div className="text-[10px] font-bold text-slate-600 mt-1">{c.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatBox label="Served" value={stats.customersServed || 0} />
        <StatBox label="Perfect" value={stats.perfectOrders || 0} />
        <StatBox label="Mistakes" value={stats.mistakes || 0} />
        <StatBox label="Max Combo" value={stats.highestCombo || 0} />
        <StatBox label="Dollars earned" value={fmtShort(stats.lifetimeCoins || 0)} />
        <StatBox label="Rounds" value={stats.roundsPlayed || 0} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-heading text-yellow-300 text-lg">Achievements</h3>
          <span className="font-heading text-sm text-yellow-300 bg-black/25 rounded-full px-2.5 py-0.5">
            {ACHIEVEMENTS.filter((a) => player.achievementProgress[a.id]?.claimed).length} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const prog = player.achievementProgress[a.id] || { value: 0, claimed: false };
            const earned = prog.claimed;
            const pct = Math.min(100, (prog.value / a.target) * 100);
            const tier = ACH_TIER_META[a.tier];
            return (
              <div key={a.id} className={`rounded-2xl p-2 border text-center transition bg-tropic-coral border-red-700 ${earned ? 'ring-2 ring-yellow-300' : ''}`}>
                <div className="flex justify-center"><AchIcon id={a.id} size={26} /></div>
                <div className="font-heading text-lg text-yellow-300 leading-none mt-1">{a.name}</div>
                <div className="text-[10px] text-yellow-100/90 leading-tight mt-0.5">{a.description}</div>
                {tier && (
                  <span className={`inline-block text-[9px] font-extrabold border rounded-full px-1.5 mt-1 ${tier.badge}`}>{tier.label}</span>
                )}
                <div className="text-[10px] text-yellow-200 font-bold mt-0.5 flex items-center justify-center gap-1">
                  <CoinIcon className="w-3.5 h-3.5 inline-block" /> {(a.reward.coins || 0).toLocaleString()}
                  <span className="opacity-70">·</span>
                  <GemIcon className="w-3.5 h-3.5 inline-block" /> {a.reward.gems || 0}
                </div>
                {earned ? (
                  <div className="text-[10px] text-yellow-200 font-bold mt-0.5">Unlocked ✓</div>
                ) : (
                  <div className="w-full h-1 bg-black/20 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-yellow-300" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}