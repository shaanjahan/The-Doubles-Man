import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/base44Client';
import { usePlayerState } from '@/lib/game/PlayerContext';
import CoinIcon from '@/components/CoinIcon';
import GemIcon from '@/components/GemIcon';
import { IconTrophy, IconMedal, IconCrown } from '@/components/game/art/icons';

// Labels for prize rows — keep in sync with Leaderboard's CATEGORIES.
const CAT_LABELS = {
  round_score: 'Best Round',
  customers_served: 'Customers',
  max_combo: 'Longest Combo',
  total_earnings: 'Top Earner',
  biz_value: 'Empire Value',
  daily_challenge: "Today's Rush",
};
const PERIOD_LABELS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const TONES = ['gold', 'silver', 'bronze'];

// Podium payout celebration. Prizes are credited server-side the moment a
// board period ends (award_finished_boards cron) — this popup is the ceremony,
// not the transaction. Rows come from board_prizes under RLS (own rows only);
// dismissing flips `seen` (the only client-writable column) and reloads the
// player so the HUD shows the already-credited wallet.
export default function PrizeCelebration() {
  const { player, reload } = usePlayerState();
  const [prizes, setPrizes] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!player?.userId) return;
    let on = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('board_prizes')
          .select('*')
          .eq('seen', false)
          .order('awarded_at', { ascending: true });
        if (on && data?.length) setPrizes(data);
      } catch { /* best-effort — prizes are already credited */ }
    })();
    return () => { on = false; };
  }, [player?.userId]);

  if (!prizes?.length) return null;

  const totalCash = prizes.reduce((s, p) => s + (p.cash || 0), 0);
  const totalGems = prizes.reduce((s, p) => s + (p.gems || 0), 0);
  const wonCrown = prizes.some((p) => p.period === 'weekly' && p.category === 'round_score' && p.place === 1);

  async function collect() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase.from('board_prizes').update({ seen: true }).in('id', prizes.map((p) => p.id));
    } catch { /* leave unseen — the ceremony replays next session */ }
    setPrizes(null);
    setBusy(false);
    reload?.();
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-doubles-night border border-white/15 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-tropic-carnival px-4 pt-5 pb-4 text-center text-foreground">
          <div className="flex justify-center mb-1"><IconTrophy size={44} /></div>
          <h2 className="text-2xl font-extrabold tracking-wide">PAYDAY!</h2>
          <p className="text-[12px] font-bold opacity-80">Yuh made de podium — de boards pay out!</p>
        </div>
        <div className="max-h-[40vh] overflow-y-auto px-3 py-2 space-y-1.5">
          {prizes.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-3 py-2">
              <IconMedal size={22} tone={TONES[(p.place || 1) - 1] || 'bronze'} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-extrabold text-white truncate">
                  #{p.place} · {CAT_LABELS[p.category] || p.category}
                </div>
                <div className="text-[10px] text-white/60 font-bold truncate">
                  {PERIOD_LABELS[p.period] || p.period} board · {p.period_key}
                  {p.period === 'weekly' && p.category === 'round_score' && p.place === 1 ? ' · Vendor of the Week!' : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-[12px] font-extrabold text-tropic-gold">
                  +{(p.cash || 0).toLocaleString()} <CoinIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center justify-end gap-1 text-[12px] font-extrabold text-white/90">
                  +{p.gems || 0} <GemIcon className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
        {wonCrown && (
          <div className="mx-3 mb-1 flex items-center justify-center gap-1.5 text-[11px] font-extrabold text-tropic-gold">
            <IconCrown size={16} /> You wear the crown all week!
          </div>
        )}
        <div className="px-3 pb-4 pt-2">
          <button
            onClick={collect}
            disabled={busy}
            className="w-full py-3 rounded-2xl bg-tropic-gold text-amber-950 font-extrabold text-sm active:scale-95 transition"
          >
            {busy ? 'Collecting…' : (
              <span className="flex items-center justify-center gap-1.5">
                Collect +{totalCash.toLocaleString()} <CoinIcon className="w-4 h-4" /> +{totalGems} <GemIcon className="w-4 h-4" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
