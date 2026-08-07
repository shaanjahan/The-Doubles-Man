import React, { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { useRefreshHandler } from '@/lib/game/RefreshContext';
import { base44, supabase } from '@/api/base44Client';
import PlayerAvatar from '@/components/PlayerAvatar';
import ShareStories from '@/components/ShareStories';
import GemIcon from '@/components/GemIcon';
import { tierByIndex, BOARD_PRIZES } from '@/lib/game/catalog';
import { IconTrophy, IconBell, IconFlame, IconMedal, IconCashStack, IconStorefront, IconBolt, IconCrown } from '@/components/game/art/icons';

const CATEGORIES = [
  { id: 'round_score', label: 'Best Round', Icon: IconTrophy },
  { id: 'customers_served', label: 'Customers', Icon: IconBell },
  { id: 'max_combo', label: 'Longest Combo', Icon: IconFlame },
  // Cumulative dollars earned in the period (rounds + idle collections);
  // all-time converges to lifetime earnings.
  { id: 'total_earnings', label: 'Top Earner', Icon: IconCashStack },
  // Snapshot of empire value (total invested in businesses), greatest-per-period.
  { id: 'biz_value', label: 'Empire Value', Icon: IconStorefront },
  // Today's Rush: the one-attempt seeded daily challenge — inherently a daily
  // board, so selecting it pins the period to 'daily' (chips row hides).
  { id: 'daily_challenge', label: "Today's Rush", Icon: IconBolt },
];

const PERIODS = [
  { id: 'daily',   label: 'Daily' },
  { id: 'weekly',  label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'alltime', label: 'All Time' },
];

// Current board key for a period, in TRINIDAD time (America/Port_of_Spain,
// fixed UTC-4, no DST) — MUST mirror the server's board functions
// ('YYYY-MM-DD' / ISO 'IYYY-"W"IW' / 'YYYY-MM'). Boards flip at midnight
// local, and a new key is what "resets" a board; nothing is ever wiped.
function periodKeyFor(period, now = new Date()) {
  const d = new Date(now.getTime() - 4 * 3600 * 1000);
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

// When each period's podium gets paid (award_finished_boards cron, midnight
// America/Port_of_Spain). Amounts render from the BOARD_PRIZES mirror.
const PAYOUT_COPY = {
  daily: 'Daily prizes — paid nightly at midnight (Trini time)',
  weekly: 'Weekly prizes — paid Sunday night at midnight',
  monthly: 'Monthly prizes — paid at month end',
};
const MEDAL_TONES = ['gold', 'silver', 'bronze'];
const fmtPrize = (n) => (n >= 1e6 ? `${n / 1e6}M` : `${n / 1e3}K`);

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
  // Reigning Vendor of the Week: last weekly Best Round #1 (current_crown RPC).
  const [crown, setCrown] = useState(null);

  useEffect(() => {
    let on = true;
    supabase.rpc('current_crown')
      .then(({ data }) => { if (on && data?.length) setCrown(data[0]); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

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
            <c.Icon size={15} /> {c.label}
          </button>
        ))}
      </div>

      {effectivePeriod !== 'alltime' && BOARD_PRIZES[effectivePeriod] && (
        <div className="bg-white/10 border border-white/15 rounded-2xl px-3 py-2 space-y-1">
          <div className="text-[10px] uppercase font-extrabold text-white/60 tracking-wide">
            {PAYOUT_COPY[effectivePeriod]}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
            {MEDAL_TONES.map((tone, i) => (
              <span key={tone} className="flex items-center gap-1 text-[11px] font-extrabold text-white">
                <IconMedal size={14} tone={tone} /> ${fmtPrize(BOARD_PRIZES[effectivePeriod].cash[i])} + {BOARD_PRIZES[effectivePeriod].gems[i]}
                <GemIcon className="w-3 h-3" />
              </span>
            ))}
            {effectivePeriod === 'weekly' && (
              <span className="flex items-center gap-1 text-[11px] font-extrabold text-tropic-gold">
                <IconCrown size={14} /> Best Round #1 wears the crown
              </span>
            )}
          </div>
        </div>
      )}

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
            const medalTone = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null;
            return (
              <div key={e.id} className={`flex items-center gap-3 px-3 py-2 border-b border-amber-50 last:border-0 ${mine ? 'bg-amber-50' : ''}`}>
                <div className="w-7 font-bold text-slate-400 text-sm flex justify-center">{medalTone ? <IconMedal size={20} tone={medalTone} /> : i + 1}</div>
                <PlayerAvatar avatarEmoji={e.avatarEmoji} sizeClass="w-8 h-8" emojiClass="text-lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-800 flex items-center gap-1 min-w-0">
                    <span className="truncate">{e.displayName}{mine ? ' (you)' : ''}</span>
                    {crown && e.ownerId === crown.owner_id && <IconCrown size={13} className="shrink-0" />}
                  </div>
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