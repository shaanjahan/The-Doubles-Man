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
  // Today's Rush: the one-attempt seeded daily challenge — inherently a daily
  // board, so selecting it pins the period to 'daily' (chips row hides).
  { id: 'daily_challenge', label: "Today's Rush", emoji: '⚡' },
];

const PERIODS = [
  { id: 'daily',   label: 'Daily' },
  { id: 'weekly',  label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'alltime', label: 'All Time' },
];

// Current board key for a period, in UTC — MUST mirror the server's
// leaderboard_upsert_best ('YYYY-MM-DD' / ISO 'IYYY-"W"IW' / 'YYYY-MM').
// A new key is what "resets" a board; nothing is ever wiped.
function periodKeyFor(period, d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (period === 'daily') return `${y}-${m}-${day}`;
  if (period === 'monthly') return `${y}-${m}`;
  if (period === 'weekly') {
    // ISO-8601 week + week-numbering year (Postgres IYYY-"W"IW).
    const t = new Date(Date.UTC(y, d.getUTCMonth(), d.getUTCDate()));
    t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3); // nearest Thursday
    const isoYear = t.getUTCFullYear();
    const jan4 = new Date(Date.UTC(isoYear, 0, 4));
    const week = 1 + Math.round(((t - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
    return `${isoYear}-W${String(week).padStart(2, '0')}`;
  }
  return ''; // alltime
}

const EMPTY_COPY = {
  daily: 'No entries yet today — be the first vendor on the board!',
  weekly: 'No entries yet this week — be the first vendor on the board!',
  monthly: 'No entries yet this month — be the first vendor on the board!',
  alltime: 'No entries yet — be the first vendor to make the board!',
};

export default function Leaderboard() {
  const { player } = usePlayerState();
  const [entries, setEntries] = useState([]);
  const [cat, setCat] = useState('round_score');
  const [period, setPeriod] = useState('alltime');
  const [loading, setLoading] = useState(true);

  // Fetch the selected board on the server (filter + sort by score desc) so
  // combo entries (small scores) aren't crowded out of a global top-N window by
  // the much larger round_score / customers_served values.
  // Today's Rush is inherently a daily board — pin its period regardless of tab.
  const effectivePeriod = cat === 'daily_challenge' ? 'daily' : period;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.LeaderboardEntry.filter(
        { category: cat, period: effectivePeriod, periodKey: periodKeyFor(effectivePeriod) },
        '-score',
        200,
      );
      setEntries(rows || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [cat, effectivePeriod]);

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

      {cat !== 'daily_challenge' && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold shrink-0 transition ${p.id === period ? 'bg-tropic-sea text-white' : 'bg-white/10 text-white/70 border border-white/15'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

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
            {cat === 'daily_challenge'
              ? "Nobody has taken on Today's Rush yet — be the first!"
              : (EMPTY_COPY[effectivePeriod] || EMPTY_COPY.alltime)}
          </div>
        ) : (
          filtered.map((e, i) => {
            const mine = e.ownerId === myId;
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