import React from 'react';
import { Sun, CalendarDays, CalendarRange } from 'lucide-react';
import CoinIcon from '@/components/CoinIcon';

export function MissionRow({ m }) {
  const pct = Math.min(100, (m.value / m.target) * 100);
  const rewardBits = [];
  if (m.reward?.coins) rewardBits.push(<span key="c" className="inline-flex items-center gap-0.5">+{m.reward.coins}<CoinIcon className="w-3 h-3 inline-block" /></span>);
  if (m.reward?.gems) rewardBits.push(<span key="g">+{m.reward.gems} 💎</span>);
  if (m.reward?.xp) rewardBits.push(<span key="x">+{m.reward.xp} XP</span>);

  return (
    <div className="bg-white rounded-2xl p-3 border border-amber-50 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`text-sm font-bold ${m.claimed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.desc}</div>
        {m.claimed && <span className="text-emerald-500 text-xs font-bold shrink-0 ml-2">Claimed ✓</span>}
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-1 text-[11px] text-slate-500 font-bold">
        <span>{m.claimed ? 'Done' : `${Math.min(m.value, m.target)}/${m.target}`}</span>
        <span className="inline-flex items-center gap-1">{rewardBits.map((b, i) => <React.Fragment key={i}>{i > 0 && ' · '}{b}</React.Fragment>)}</span>
      </div>
    </div>
  );
}

const GROUPS = [
  { title: 'Daily', Icon: Sun, accent: 'text-tropic-gold', key: 'dailyMissions' },
  { title: 'Weekly', Icon: CalendarDays, accent: 'text-tropic-sea', key: 'weeklyMissions' },
  { title: 'Monthly', Icon: CalendarRange, accent: 'text-tropic-coral', key: 'monthlyMissions' },
];

export default function MissionsPanel({ player }) {
  if (!player) return null;
  return (
    <div className="space-y-3">
      {GROUPS.map((g) => {
        const list = player[g.key] || [];
        return (
          <section key={g.title} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <g.Icon className={`${g.accent} drop-shadow`} size={18} />
              <h2 className="text-sm font-extrabold text-tropic-gold drop-shadow">{g.title} Missions</h2>
            </div>
            {list.length === 0 ? (
              <p className="text-xs text-white/50">No {g.title.toLowerCase()} missions yet.</p>
            ) : (
              list.map((m) => <MissionRow key={m.id} m={m} />)
            )}
          </section>
        );
      })}
    </div>
  );
}