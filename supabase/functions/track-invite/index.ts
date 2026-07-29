// supabase/functions/track-invite/index.ts
//
// Server-authoritative invite tracking. Ports the Base44 client trackInvite
// (a raw Player.update fired from ShareStories on share). Increments
// invited_friends and progresses the wm_invite_2 weekly mission.
//
// No invite verification exists in the source (the client fires on share), so
// this increments unconditionally -- but the only reward is the one-time
// wm_invite_2 (15 gems), so the abuse ceiling is 15 gems. No achievement keys
// off invitedFriends, so no achievement evaluation here.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { buildDefaultMissions, evaluateMissions } from '../_shared/catalog.ts';

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

    const defaults = buildDefaultMissions();
    const { data: applied, error: rpcErr } = await admin.rpc('invite_track_apply', {
      p_user_id: user.id,
      p_default_daily: defaults.daily,
      p_default_weekly: defaults.weekly,
      p_default_monthly: defaults.monthly,
    });
    if (rpcErr) throw rpcErr;
    if (applied?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (!applied || applied.error) {
      return Response.json({ error: applied?.error || 'invite failed' }, { status: 500 });
    }

    // Bump the invite mission (wm_invite_2) against the new invited_friends count.
    const mp = camelizeKeys(applied.player);
    const stats = camelizeKeys(applied.stats);
    const me = evaluateMissions(
      Array.isArray(mp.dailyMissions) ? mp.dailyMissions : [],
      Array.isArray(mp.weeklyMissions) ? mp.weeklyMissions : [],
      Array.isArray(mp.monthlyMissions) ? mp.monthlyMissions : [],
      { invitedFriends: Number(stats.invitedFriends) || 0 },
    );

    let finalPlayer = applied.player;
    let finalStats = applied.stats;
    const { data: after, error: mErr } = await admin.rpc('missions_apply', {
      p_user_id: user.id,
      p_daily: me.daily,
      p_weekly: me.weekly,
      p_monthly: me.monthly,
    });
    if (mErr) throw mErr;
    if (after && !after.error) {
      finalPlayer = after.player;
      finalStats = after.stats;
    }

    return Response.json({
      player: toClientPlayer(finalPlayer, finalStats),
      invitedFriends: Number(camelizeKeys(finalStats).invitedFriends) || 0,
      completedMissions: me.completed,
    });
  } catch (error) {
    console.error('track-invite error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
