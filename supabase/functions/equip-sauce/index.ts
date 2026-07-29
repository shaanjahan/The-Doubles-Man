// supabase/functions/equip-sauce/index.ts
//
// Server-authoritative equip/unequip of magic sauces. Replaces the Base44
// client-side toggleEquipSauce, which wrote equipped_sauces via a raw
// Player.update. equipped_sauces is security-sensitive: finalize-round applies
// reward-ceiling multipliers from it WITHOUT an ownership check, so equipping an
// unowned sauce would inflate the ceiling and let forged coin amounts pass the
// clamp. This function enforces ownership at equip time (in equip_sauce_apply,
// under lock); equipped_sauces is never client-writable.
//
// Toggle semantics match toggleEquipSauce: same sauceId equips if not equipped
// (append, or replace slot [1] when 2 are already equipped) and unequips if it
// already is.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { MAGIC_SAUCES } from '../_shared/catalog.ts';

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

Deno.serve(async (req) => {
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
    const sauceId = String(body?.sauceId ?? '');
    if (!MAGIC_SAUCES.some((s) => s.id === sauceId)) {
      return Response.json({ error: 'Unknown sauce' }, { status: 400 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: applied, error: rpcErr } = await admin.rpc('equip_sauce_apply', {
      p_user_id: user.id,
      p_sauce_id: sauceId,
    });
    if (rpcErr) throw rpcErr;
    if (applied?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (applied?.error === 'not_owned') {
      return Response.json({ error: "You don't own that sauce" }, { status: 403 });
    }
    if (!applied || applied.error) {
      return Response.json({ error: applied?.error || 'equip failed' }, { status: 500 });
    }

    return Response.json({
      player: toClientPlayer(applied.player, applied.stats),
      equipped: applied.equipped,
    });
  } catch (error) {
    console.error('equip-sauce error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
