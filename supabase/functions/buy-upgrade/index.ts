// supabase/functions/buy-upgrade/index.ts
//
// Server-authoritative upgrade purchase. Replaces the Base44 client-side
// buyUpgrade, which mutated player.upgrades / coins in the browser and pushed
// the whole doc via a raw Player.update — letting a client grant itself any
// upgrade for free. The client now sends only the upgrade id; the server looks
// up the catalog cost, verifies the player can afford it, and applies the
// purchase atomically under a row lock (upgrade_buy_apply).
//
// buyUpgrade changes only coins + upgrades, neither of which is an achievement
// or mission stat, so no achievement/mission evaluation happens here (see
// MIGRATION.md — that folding belongs in claimDaily / openSaucePack /
// finalize-round, the functions that actually move those stats).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { getUpgrade } from '../_shared/catalog.ts';

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
    const upgradeId = String(body?.upgradeId ?? '');
    const upg = getUpgrade(upgradeId);
    if (!upg) return Response.json({ error: 'Unknown upgrade' }, { status: 400 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: applied, error: rpcErr } = await admin.rpc('upgrade_buy_apply', {
      p_user_id: user.id,
      p_upgrade_id: upgradeId,
      p_base_cost: upg.baseCost,
      p_growth: upg.growth,
      p_max_level: upg.maxLevel,
    });
    if (rpcErr) throw rpcErr;
    if (applied?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (applied?.error === 'max_level') {
      return Response.json({ error: 'Upgrade already at max level', level: applied.level }, { status: 400 });
    }
    if (applied?.error === 'insufficient') {
      return Response.json({ error: 'Not enough dollars', cost: applied.cost }, { status: 400 });
    }
    if (!applied || applied.error) {
      return Response.json({ error: applied?.error || 'buy failed' }, { status: 500 });
    }

    return Response.json({
      player: toClientPlayer(applied.player, applied.stats),
      cost: Number(applied.cost) || 0,
      upgrade: applied.upgrade,
      level: applied.level,
    });
  } catch (error) {
    console.error('buy-upgrade error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
