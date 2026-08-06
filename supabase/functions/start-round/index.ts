// supabase/functions/start-round/index.ts
//
// Bara Stock purchases — the ONLY path round stock is ever bought through.
// Two actions, both server-priced from the shared STOCK catalog (any
// client-supplied cost is ignored):
//   * start   — charge the pre-round crate investment and register the
//               round's allowance under its sessionId (atomic, row-locked).
//               Rounds with zero crates never call this: the free base
//               allowance needs no charge and no network.
//   * restock — mid-round: extend the SAME session's allowance for an
//               escalating price (x1.5 per successive restock).
// Investment is non-refundable by design — quitting or crashing forfeits
// unsold stock; there is no refund path to exploit.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { STOCK, stockRank, restockBundleCrates, restockCost } from '../_shared/catalog.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const action = String(body?.action || 'start');
    const sessionId = String(body?.sessionId || '');
    if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 });

    const { data: player, error: selErr } = await admin
      .from('players').select('business_tier, pending_round_stock').eq('user_id', user.id).maybeSingle();
    if (selErr) throw selErr;
    if (!player) return Response.json({ error: 'No player record' }, { status: 404 });
    const rank = stockRank(player.business_tier);

    if (action === 'start') {
      const crates = Math.min(Math.max(Number(body?.crates) || 0, 0), STOCK.maxCratesByRank[rank]);
      if (crates === 0) return Response.json({ error: 'Zero crates needs no purchase' }, { status: 400 });
      const cost = crates * STOCK.cratePriceByRank[rank];
      const allowance = STOCK.baseByRank[rank] + crates * STOCK.crateSize;
      const { data: applied, error: rpcErr } = await admin.rpc('round_stock_start', {
        p_user_id: user.id, p_session_id: sessionId, p_allowance: allowance, p_cost: cost,
      });
      if (rpcErr) throw rpcErr;
      if (applied?.error === 'insufficient') {
        return Response.json({ error: 'Not enough dollars', cost }, { status: 400 });
      }
      if (!applied?.ok) return Response.json({ error: applied?.error || 'start failed' }, { status: 500 });
      return Response.json({
        coins: applied.coins, allowance,
        nextRestockCost: restockCost(rank, 0),
      });
    }

    if (action === 'restock') {
      const stock = player.pending_round_stock;
      // Rounds started with zero crates have no pending record yet — their
      // first restock creates one implicitly (base allowance, spend so far 0).
      const restocks = stock && stock.session_id === sessionId ? Number(stock.restocks) || 0 : 0;
      const add = restockBundleCrates(rank) * STOCK.crateSize;
      const cost = restockCost(rank, restocks);
      let applied: any;
      if (stock && stock.session_id === sessionId) {
        const r = await admin.rpc('round_stock_restock', {
          p_user_id: user.id, p_session_id: sessionId, p_add: add, p_cost: cost,
        });
        if (r.error) throw r.error;
        applied = r.data;
      } else {
        const r = await admin.rpc('round_stock_start', {
          p_user_id: user.id, p_session_id: sessionId,
          p_allowance: STOCK.baseByRank[rank] + add, p_cost: cost,
        });
        if (r.error) throw r.error;
        applied = r.data;
      }
      if (applied?.error === 'insufficient') {
        return Response.json({ error: 'Not enough dollars', cost }, { status: 400 });
      }
      if (!applied?.ok) return Response.json({ error: applied?.error || 'restock failed' }, { status: 500 });
      return Response.json({
        coins: applied.coins, added: add, allowance: applied.allowance,
        nextRestockCost: restockCost(rank, (Number(applied.restocks) || restocks) + 1),
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('start-round error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
