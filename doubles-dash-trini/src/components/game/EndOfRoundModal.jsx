import React from 'react';
import {
  Trophy,
  Star,
  PartyPopper,
  Meh,
  Bell,
  Sparkles,
  Flame,
  Frown,
  Gem,
  Zap,
} from 'lucide-react';
import CoinIcon from '@/components/CoinIcon';
import ShareStories from '@/components/ShareStories';
import LevelUpCelebration from './LevelUpCelebration';

function Stat({ label, value, icon }) {
  return (
    <div className="bg-white/5 rounded-xl p-2 flex items-center gap-2 border border-white/10">
      <span className="shrink-0">{icon}</span>
      <div>
        <div className="text-[10px] text-white/50 uppercase font-bold tracking-wide">{label}</div>
        <div className="font-extrabold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Score({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center">
      <span className="mb-0.5">{icon}</span>
      <div className="font-extrabold text-white">{value}</div>
      <div className="text-[10px] font-bold text-amber-950/80">{label}</div>
    </div>
  );
}

export default function EndOfRoundModal({ outcome, onPlayAgain, onMenu }) {
  if (!outcome) return null;

  let MoodIcon = Meh;
  let moodColor = 'text-white/50';
  if (outcome.perfectCount >= 6) {
    MoodIcon = Trophy;
    moodColor = 'text-tropic-gold';
  } else if (outcome.mistakes === 0) {
    MoodIcon = Star;
    moodColor = 'text-tropic-gold';
  } else if (outcome.servedCount > 0) {
    MoodIcon = PartyPopper;
    moodColor = 'text-tropic-sea';
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-doubles-night border border-white/15 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-center animate-[pop-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]">
        {outcome.perfectCount >= 6 && (
          <div className="flex justify-center items-center gap-1.5 mb-1 text-xl animate-[float-soft_2.4s_ease-in-out_infinite]">
            <Sparkles size={18} className="text-tropic-purple" />
            <PartyPopper size={20} className="text-tropic-sea" />
            <Star size={20} className="text-tropic-gold fill-tropic-gold" />
            <CoinIcon className="w-5 h-5" />
            <Sparkles size={18} className="text-tropic-purple" />
          </div>
        )}
        <div className="flex justify-center mb-1 animate-[combo-pop_0.5s_ease-out]">
          <MoodIcon className={moodColor} size={48} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-extrabold text-tropic-gold tracking-wide drop-shadow">SERVICE COMPLETE!</h2>
        {outcome.levelAfter > outcome.levelBefore && (
          <div className="mt-3">
            <LevelUpCelebration
              levelBefore={outcome.levelBefore}
              levelAfter={outcome.levelAfter}
              xpAfter={outcome.xpAfter}
              xpForNext={outcome.xpForNext}
              rewardCoins={outcome.levelUpCoins}
              rewardGems={outcome.levelUpGems}
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mt-3 text-left">
          <Stat label="Served" value={outcome.servedCount} icon={<Bell size={20} className="text-tropic-teal" />} />
          <Stat label="Perfect" value={outcome.perfectCount} icon={<Sparkles size={20} className="text-tropic-purple" />} />
          <Stat label="Max Combo" value={outcome.maxCombo} icon={<Flame size={20} className="text-tropic-sea" />} />
          <Stat label="Mistakes" value={outcome.mistakes} icon={<Frown size={20} className="text-tropic-coral" />} />
        </div>
        <div className="mt-4 rounded-2xl p-3 border border-tropic-sea/40 bg-gradient-to-r from-amber-400 to-amber-500 flex items-center justify-around">
          <Score icon={<CoinIcon className="w-6 h-6 mx-auto" />} label="Dollars" value={outcome.coinsEarned} />
          <Score icon={<Gem size={24} className="text-white mx-auto" />} label="Gems" value={outcome.gemsEarned} />
          <Score icon={<Zap size={24} className="text-white mx-auto" />} label="XP" value={outcome.xpEarned} />
        </div>
        <div className="mt-4">
          <ShareStories
            headline="My Round Score"
            big={(outcome.score ?? outcome.coinsEarned).toLocaleString()}
            bigLabel="points"
            subline={`${outcome.servedCount} served · ${outcome.perfectCount} perfect · ${outcome.maxCombo}x combo`}
          />
        </div>
        {outcome.hourlyLimited && (
          <div className="mt-3 rounded-xl p-2 text-[11px] font-bold text-center text-tropic-gold bg-tropic-gold/10 border border-tropic-gold/30">
            Hourly earning limit reached — visit the Store to raise your cap.
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onMenu}
            className="flex-1 bg-white/10 hover:bg-white/20 font-bold py-2.5 rounded-xl text-foreground active:scale-95 transition"
          >
            Hub
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 bg-gradient-to-r from-tropic-magenta to-tropic-sea font-extrabold py-2.5 rounded-xl text-white shadow-lg active:scale-95 transition"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}