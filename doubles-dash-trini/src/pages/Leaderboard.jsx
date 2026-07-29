import React, { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { useRefreshHandler } from '@/lib/game/RefreshContext';
import { base44 } from '@/api/base44Client';
import PlayerAvatar from '@/components/PlayerAvatar';
import ShareStories from '@/components/ShareStories';
import { tierByIndex } from '@/lib/game/catalog';

const CATEGORIES = [
  { id: 'round_score', label: 'Best Round', emoji: '🏆' },
  { id: 'customers_served', label: 'Customers', emoji: '🛎️' },
  { id: 'max_combo', label: 'Longest Combo', emoji: '🔥' },
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
  // Entries are created server-side under the service role, so created_by_id
  // is the service role — not the user. Each entry carries ownerId (the real
  // user id), and the current user's id is the Player record's created_by_id.
  const myId = player?.created_by_id || player?.id;
  const myIdx = filtered.findIndex((e) => (e.ownerId || e.created_by_id) === myId);

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
            <span>{c.emoji}</span> {c.label}
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
            const mine = (e.ownerId || e.created_by_id) === myId;
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            return (
              <div key={e.id} className={`flex items-center gap-3 px-3 py-2 border-b border-amber-50 last:border-0 ${mine ? 'bg-amber-50' : ''}`}>
                <div className="w-7 font-bold text-slate-400 text-sm text-center">{medal || i + 1}</div>
                <PlayerAvatar avatarEmoji={e.avatarEmoji || '🧑‍🍳'} sizeClass="w-8 h-8" emojiClass="text-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 truncate">{e.displayName}{mine ? ' (you)' : ''}</div>
                  <div className="text-[10px] text-slate-500">Lvl {e.level || 1}</div>
                </div>
                <div className="font-extrabold text-amber-700">{e.score}</div>
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
              headline="Leaderboard Rank"
              big={`#${myIdx + 1}`}
              bigLabel={`${myEntry?.score ?? 0} pts`}
              subline={`${tier.emoji} ${tier.name} · ${player?.displayName || 'Me'}`}
              emoji={tier.emoji || c?.emoji || '🏆'}
              footer="Can you beat my empire?"
            />
          </div>
        );
      })()}
    </div>
  );
}