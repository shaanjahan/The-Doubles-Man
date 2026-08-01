// supabase/functions/manage-business/index.ts
//
// Authoritative "My Business" operations, ported from the Base44
// manage-business function. The client can't grant itself idle income or
// businesses: both spend/award dollars, so the server validates the unlock
// tier, the cost, and the real-time accrual before mutating the player.
//
// Adapted for Supabase: the two mutations run in row-locking transactional RPCs
// (business_buy_apply / business_collect_apply) so concurrent calls can't
// double-spend or double-collect. The catalog stays single-sourced in
// _shared/businesses.ts; this function computes the derived rates and passes
// them to the RPCs. Response is mapped to the Base44 camelCase player + nested
// stats shape the frontend (usePlayer.js) expects.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { getUnit, incomePerMin, fleetIdleCap, businessNetValue, MAX_IDLE_MINUTES } from '../_shared/businesses.ts';

// Identity fields for the board RPCs, from the post-mutation player row.
function boardIdentity(userId: string, p: Record<string, any>) {
  return {
    p_owner_id: userId,
    p_display_name: p.display_name,
    p_avatar_emoji: p.avatar_emoji,
    p_location_id: p.current_location_id ?? 0,
    p_business_tier: p.business_tier,
    p_level: p.level,
    p_vip: !!p.vip,
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// snake_case DB row -> camelCase (top-level keys only; jsonb values keep their
// internal keys, which the game logic uses verbatim on client and server).
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
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    // Load the caller's player (needed to 404 early, and to derive collect
    // rates from the shared catalog).
    const { data: player, error: selErr } = await admin
      .from('players').select('*').eq('user_id', user.id).maybeSingle();
    if (selErr) throw selErr;
    if (!player) return Response.json({ error: 'No player record' }, { status: 404 });

    if (action === 'collect') {
      const businesses = Array.isArray(player.businesses) ? player.businesses : [];
      // Computed pre-lock; businesses/tier only ever increase, so a stale value
      // can only under-credit. Elapsed time is measured under lock in the RPC.
      const ipm = incomePerMin(businesses);
      // Fleet-scaled cap: every owned copy raises the ceiling; old tier cap
      // remains as a floor so no player's ceiling ever drops.
      const cap = fleetIdleCap(businesses, player.business_tier || 0);
      const { data: applied, error: rpcErr } = await admin.rpc('business_collect_apply', {
        p_user_id: user.id,
        p_income_per_min: ipm,
        p_idle_cap: cap,
        p_max_idle_min: MAX_IDLE_MINUTES,
      });
      if (rpcErr) throw rpcErr;
      if (!applied || applied.error) {
        return Response.json({ error: applied?.error || 'collect failed' }, { status: 500 });
      }
      // Idle income counts toward the cumulative-earnings boards (non-fatal).
      const collected = Number(applied.collected) || 0;
      if (collected > 0) {
        try {
          const { error: eErr } = await admin.rpc('earnings_board_add', {
            ...boardIdentity(user.id, applied.player),
            p_delta: collected,
            p_lifetime: Math.floor(Number(applied.stats?.lifetime_coins) || 0),
          });
          if (eErr) console.error('earnings board (collect) error:', eErr);
        } catch (e) { console.error('earnings board (collect) error:', e); }
      }
      return Response.json({
        player: toClientPlayer(applied.player, applied.stats),
        collected,
      });
    }

    if (action === 'buy') {
      const tier = Number(body?.tier);
      const unit = getUnit(tier);
      if (!unit) return Response.json({ error: 'Unknown business' }, { status: 400 });

      const { data: applied, error: rpcErr } = await admin.rpc('business_buy_apply', {
        p_user_id: user.id,
        p_tier: tier,
        p_unlock_tier: unit.tier,
        p_base_cost: unit.baseCost,
        p_cost_growth: unit.costGrowth,
      });
      if (rpcErr) throw rpcErr;
      if (applied?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
      if (applied?.error === 'locked') return Response.json({ error: 'Business not unlocked yet' }, { status: 403 });
      if (applied?.error === 'insufficient') {
        return Response.json({ error: 'Not enough dollars', cost: applied.cost }, { status: 400 });
      }
      if (!applied || applied.error) {
        return Response.json({ error: applied?.error || 'buy failed' }, { status: 500 });
      }
      // A purchase changes empire value — post the new snapshot (non-fatal).
      try {
        const { error: bErr } = await admin.rpc('bizvalue_board_set', {
          ...boardIdentity(user.id, applied.player),
          p_value: businessNetValue(Array.isArray(applied.player?.businesses) ? applied.player.businesses : []),
        });
        if (bErr) console.error('bizvalue board (buy) error:', bErr);
      } catch (e) { console.error('bizvalue board (buy) error:', e); }
      return Response.json({
        player: toClientPlayer(applied.player, applied.stats),
        cost: Number(applied.cost) || 0,
        bought: applied.bought,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manage-business error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
