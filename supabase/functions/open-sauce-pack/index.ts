// supabase/functions/open-sauce-pack/index.ts
//
// Server-authoritative mystery sauce pack. Replaces the Base44 client-side
// openSaucePack, which took a client-supplied gem cost, rolled the loot in the
// browser, and pushed the whole Player doc via a raw update.
//
// Hardening vs the client version:
//   * Gem cost is sourced server-side (SAUCE_PACK_GEM_COST) — the client's
//     costGems is IGNORED entirely (an attacker would pass 0).
//   * The 3-sauce roll happens server-side (rollSaucePack) — the client can't
//     roll its own loot or inject specific sauces.
// The gem deduction + inventory grant run atomically under a row lock
// (sauce_pack_open_apply); the sauce_collector achievement is then evaluated
// (shared evaluator) and granted idempotently via achievements_apply.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { SAUCE_PACK_GEM_COST, rollSaucePack, evaluateAchievements } from '../_shared/catalog.ts';

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

    // Roll the loot server-side. (Any client-supplied costGems in the body is
    // intentionally not read — the price is SAUCE_PACK_GEM_COST.)
    const rolled = rollSaucePack();

    const { data: opened, error: rpcErr } = await admin.rpc('sauce_pack_open_apply', {
      p_user_id: user.id,
      p_cost_gems: SAUCE_PACK_GEM_COST,
      p_sauce_ids: rolled,
    });
    if (rpcErr) throw rpcErr;
    if (opened?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (opened?.error === 'insufficient') {
      return Response.json({ error: 'Not enough gems', cost: opened.cost }, { status: 400 });
    }
    if (!opened || opened.error) {
      return Response.json({ error: opened?.error || 'open failed' }, { status: 500 });
    }

    // sauce_collector achievement (own 5 unique sauces) may newly unlock.
    const ach = evaluateAchievements(camelizeKeys(opened.player), camelizeKeys(opened.stats));
    let finalPlayer = opened.player;
    let finalStats = opened.stats;
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
      granted: rolled,
      cost: SAUCE_PACK_GEM_COST,
      newAchievements: ach.newly,
    });
  } catch (error) {
    console.error('open-sauce-pack error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
