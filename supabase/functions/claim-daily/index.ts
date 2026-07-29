// supabase/functions/claim-daily/index.ts
//
// Server-authoritative daily reward claim. Replaces the Base44 client-side
// claimDaily (src/lib/game/usePlayer.js), which decided the reward tier and
// streak in the browser and pushed the whole Player doc via a raw update —
// letting a client claim repeatedly or jump to the day-7 reward.
//
// Ports the GAME-HOOK / Player-model version (not the dead
// claim-daily-reward/PlayerProfile path): UTC calendar day, gap-reset streak,
// catalog.js DAILY_REWARDS. The claim (streak + reward + level-up + sauce) is
// applied atomically under a row lock in daily_claim_apply; achievements are
// then evaluated (shared evaluator in _shared/catalog.ts) and granted
// idempotently via achievements_apply.
//
// NOTE: the daily mission/counter reset the client did inside claimDaily is
// intentionally NOT here — tracked as a follow-up in MIGRATION.md.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { DAILY_REWARDS, evaluateAchievements } from '../_shared/catalog.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
function camelizeKeys(row: Record<string, any> | null): Record<string, any> {
  const out: Record<string, any> = {};
  if (!row) return out;
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}
function toClientPlayer(playerRow: Record<string, any>, statsRow: Record<string, any> | null) {
  return { ...camelizeKeys(playerRow), stats: camelizeKeys(statsRow) };
}

serveWithCors(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Apply the claim atomically.
    const { data: claimed, error: rpcErr } = await admin.rpc('daily_claim_apply', {
      p_user_id: user.id,
      p_rewards: DAILY_REWARDS,
      p_max_day: DAILY_REWARDS.length,
    });
    if (rpcErr) throw rpcErr;
    if (claimed?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (claimed?.error === 'already_claimed') {
      return Response.json({ error: 'Already claimed today', alreadyClaimed: true }, { status: 409 });
    }
    if (!claimed || claimed.error) {
      return Response.json({ error: claimed?.error || 'claim failed' }, { status: 500 });
    }

    // 2. Evaluate achievements against the authoritative post-claim state, and
    //    grant idempotently. (streak_7, or level_10/25 if the reward's xp leveled
    //    the player up, or sauce_collector if a sauce reward hit 5 unique.)
    const ach = evaluateAchievements(camelizeKeys(claimed.player), camelizeKeys(claimed.stats));
    let finalPlayer = claimed.player;
    let finalStats = claimed.stats;
    if (ach.grants.length || Object.keys(ach.progressUpdates).length) {
      const { data: after, error: achErr } = await admin.rpc('achievements_apply', {
        p_user_id: user.id,
        p_grants: ach.grants,
        p_progress: ach.progressUpdates,
      });
      if (achErr) throw achErr;
      if (after && !after.error) {
        finalPlayer = after.player;
        finalStats = after.stats;
      }
    }

    return Response.json({
      player: toClientPlayer(finalPlayer, finalStats),
      reward: claimed.reward,
      streak: claimed.streak,
      day: claimed.day,
      newAchievements: ach.newly,
    });
  } catch (error) {
    console.error('claim-daily error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
