import React, { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { useRefreshHandler } from '@/lib/game/RefreshContext';
import { base44 } from '@/api/base44Client';
import PlayerAvatar from '@/components/PlayerAvatar';
import ShareStories from '@/components/ShareStories';
import { tierByIndex } from '@/lib/game/catalog';
import { IconTrophy, IconBell, IconFlame, IconMedal } from '@/components/game/art/icons';

const CATEGORIES = [
  { id: 'round_score', label: 'Best Round', Icon: IconTrophy },
  { id: 'customers_served', label: 'Customers', Icon: IconBell },
  { id: 'max_combo', label: 'Longest Combo', Icon: IconFlame },
];

export default function Leaderboard() {
  const { player } = usePlayerState();
  const [entries, setEntries] = useState([]);
  const [cat, setCat] = useState('round_score');
  const [loading, setLoading] = useState(true);

  // Fetch the selected category on the server (filter + sort by score desc) so
  // combo entries (small scores) aren't crowded out of a global top-N window by
  // the much larger round_score / customers_served values.
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.LeaderboardEntry.filter({ category: cat }, '-score', 200);
      setEntries(rows || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [cat]);

  useEffect(() => { reload(); }, [reload]);
  useRefreshHandler('/leaderboard', reload);

  // Top 25 scores for this category, sorted by score descending so the
  // longest combo / best round / most served always shows highest first.
  const filtered = [...entries]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 25);
  // Each entry's ownerId is the auth user id (leaderboard_entries.owner_id).
  // On the player record that same id is userId (players.user_id) — not the
  // players-table PK (player.id), so match on userId.
  const myId = player?.userId;
  const myIdx = filtered.findIndex((e) => e.ownerId === myId);

  return (
    <div className="max-w-2xl mx-auto px-3 pt-3 pb-6 space-y-3">
      <h1 className="text-3xl font-extrabold text-tropic-coral tracking-wide">Leaderboards</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 shrink-0 transition ${c.id === cat ? 'bg-amber-400 text-amber-950' : 'bg-white text-slate-500 border border-amber-100'}`}
          >
            <c.Icon size={15} /> {c.label}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-3xl shadow border border-amber-100 overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-slate-500">Loading champions…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            <Trophy className="mx-auto text-amber-400 mb-1" size={28} />
            No entries yet — be the first vendor to make the board!
          </div>
        ) : (
          filtered.map((e, i) => {
            const mine = e.ownerId === myId;
            const medalTone = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null;
            return (
              <div key={e.id} className={`flex items-center gap-3 px-3 py-2 border-b border-amber-50 last:border-0 ${mine ? 'bg-amber-50' : ''}`}>
                <div className="w-7 font-bold text-slate-400 text-sm flex justify-center">{medalTone ? <IconMedal size={20} tone={medalTone} /> : i + 1}</div>
                <PlayerAvatar avatarEmoji={e.avatarEmoji} sizeClass="w-8 h-8" emojiClass="text-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{e.displayName}{mine ? ' (you)' : ''}</div>
                  <div className="text-[10px] text-slate-500">Lvl {e.level || 1}</div>
                </div>
                <div className="font-extrabold text-amber-700">{(e.score || 0).toLocaleString()}</div>
              </div>
            );
          })
        )}
      </section>

      {myIdx >= 0 && (() => {
        const c = CATEGORIES.find((x) => x.id === cat);
        const myEntry = filtered[myIdx];
        const tier = tierByIndex(player?.businessTier);
        return (
          <div className="space-y-2">
            <p className="text-xs text-center text-slate-500">You're ranked #{myIdx + 1}. Keep on serving!</p>
            <ShareStories
              variant="rank"
              headline="Leaderboard Rank"
              big={`#${myIdx + 1}`}
              bigLabel={`${(myEntry?.score ?? 0).toLocaleString()} pts`}
              subline={`${tier.name} · ${player?.displayName || 'Me'}`}
              footer="Can you beat my empire?"
            />
          </div>
        );
      })()}
    </div>
  );
}