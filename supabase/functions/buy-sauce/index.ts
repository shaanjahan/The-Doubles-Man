// supabase/functions/buy-sauce/index.ts
//
// Direct purchase of a specific Magic Sauce for gems, priced by rarity
// (SAUCE_PRICES — Common cheapest, Legendary most expensive). Complements the
// random mystery pack: players who want a particular sauce pay a premium for
// certainty instead of rolling.
//
// Server-authoritative like open-sauce-pack: the sauce id is validated against
// the catalog and the price comes from SAUCE_PRICES — any client-supplied cost
// is ignored. The gem deduction + inventory grant reuse the same atomic
// row-locked RPC as the pack (sauce_pack_open_apply, with a single-id list),
// then sauce achievements are evaluated and granted idempotently.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { MAGIC_SAUCES, SAUCE_PRICES, evaluateAchievements } from '../_shared/catalog.ts';

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

    const body = await req.json().catch(() => ({}));
    const sauceId = String(body?.sauceId || '');
    const sauce = MAGIC_SAUCES.find((s) => s.id === sauceId);
    if (!sauce) return Response.json({ error: 'Unknown sauce' }, { status: 400 });
    const cost = SAUCE_PRICES[sauce.rarity];
    if (!cost) return Response.json({ error: 'Unpriced rarity' }, { status: 400 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: bought, error: rpcErr } = await admin.rpc('sauce_pack_open_apply', {
      p_user_id: user.id,
      p_cost_gems: cost,
      p_sauce_ids: [sauceId],
    });
    if (rpcErr) throw rpcErr;
    if (bought?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (bought?.error === 'insufficient') {
      return Response.json({ error: 'Not enough gems', cost }, { status: 400 });
    }
    if (!bought || bought.error) {
      return Response.json({ error: bought?.error || 'buy failed' }, { status: 500 });
    }

    // Sauce achievements (own 3/5/8 unique sauces) may newly unlock.
    const ach = evaluateAchievements(camelizeKeys(bought.player), camelizeKeys(bought.stats));
    let finalPlayer = bought.player;
    let finalStats = bought.stats;
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
      granted: [sauceId],
      cost,
      newAchievements: ach.newly,
    });
  } catch (error) {
    console.error('buy-sauce error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
