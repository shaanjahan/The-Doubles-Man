import React from 'react';
import { Coins, Gem } from 'lucide-react';

export default function PlayerHeader({ profile, level, xpProgress, gemsReward }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-2xl bg-tropic-sunset grid place-items-center text-2xl shadow-lg">
            🧑‍🍳
          </div>
          <div className="leading-tight">
            <p className="font-heading font-bold text-sm text-foreground">{profile.vendorName}</p>
            <p className="text-[11px] text-muted-foreground font-semibold">Lv {profile.level} Vendor</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill icon={<Coins className="w-3.5 h-3.5 text-tropic-gold" />} value={profile.coins.toLocaleString()} />
          <Pill icon={<Gem className="w-3.5 h-3.5 text-tropic-sea" />} value={profile.gems} />
        </div>
      </div>
      <div className="mt-2.5 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-tropic-sunset rounded-full transition-all duration-500" style={{ width: `${xpProgress}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-center font-semibold">{level}</p>
    </div>
  );
}

function Pill({ icon, value }) {
  return (
    <div className="flex items-center gap-1 bg-card/90 backdrop-blur px-2.5 py-1.5 rounded-full border border-border/70 shadow-sm">
      {icon}
      <span className="text-xs font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}