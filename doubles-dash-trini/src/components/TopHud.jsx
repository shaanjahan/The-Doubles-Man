import React from 'react';
import { Music, Music2 } from 'lucide-react';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';
import { Image } from '@/components/ui/image';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { useMusic } from '@/lib/game/MusicContext';
import { BUSINESS_TIERS, xpForLevel, tierByIndex } from '@/lib/game/catalog';
import PlayerAvatar from './PlayerAvatar';

function fmt(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.floor(n));
}

export default function TopHud() {
  const { player } = usePlayerState();
  const { muted, toggleMute } = useMusic();

  if (!player) {
    return (
      <div className="fixed top-0 inset-x-0 pt-[env(safe-area-inset-top)] h-[calc(4rem+env(safe-area-inset-top))] z-40 bg-black/70 backdrop-blur border-b border-white/10 flex items-center px-4 text-sm text-white/60">
        Warming up the tawa…
      </div>
    );
  }

  const tier = tierByIndex(player.businessTier);
  const needXp = xpForLevel(player.level);
  const xpPct = Math.max(0, Math.min(100, (player.xp / needXp) * 100));

  return (
    <div className="fixed top-0 inset-x-0 pt-[env(safe-area-inset-top)] h-[calc(4rem+env(safe-area-inset-top))] z-40 bg-black/70 backdrop-blur border-b border-white/10 shadow-sm flex items-center gap-2 px-3 md:px-5">
      <div className="flex items-center gap-2 min-w-0">
        <PlayerAvatar avatarEmoji={player.avatarEmoji} />
      </div>
      <div className="flex items-center gap-2 min-w-0" style={{ padding: 0 }}>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-tropic-gold font-bold leading-tight flex items-center gap-1">
            {tier.image && <Image src={tier.image} alt="" fittingType="fill" className="w-3.5 h-3.5 rounded-full ring-1 ring-tropic-gold shrink-0" />}
            <span className="truncate">{tier.name}</span>
          </div>
          <div className="font-extrabold text-sm leading-tight truncate flex items-center gap-1">
            {player.displayName}
            <span className="text-[10px] font-bold text-black bg-tropic-gold px-1.5 rounded-full">
              Lvl {player.level}
            </span>
          </div>
          <div className="w-24 h-1 bg-white/10 rounded-full mt-0.5 overflow-hidden">
            <div className="h-full bg-tropic-gold rounded-full transition-all" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={toggleMute}
          aria-label={muted ? 'Unmute music' : 'Mute music'}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-tropic-gold transition active:scale-90"
        >
          {muted ? <Music size={16} /> : <Music2 size={16} />}
        </button>
        <div className="flex items-center gap-1 bg-tropic-gold rounded-full px-2.5 py-1 text-sm font-bold text-black">
          <CoinIcon className="w-4 h-4" /> {fmt(player.coins)}
        </div>
        <div className="flex items-center gap-1 bg-tropic-coral rounded-full px-2.5 py-1 text-sm font-bold text-black">
          <GemIcon className="w-4 h-4" /> {fmt(player.gems)}
        </div>
      </div>
    </div>
  );
}