import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getUnit, businessCost, collectableCoins } from '../../shared/businesses.ts';

// Authoritative "My Business" operations. The client can't grant itself idle
// income or businesses: both spend/award dollars, so the server validates the
// unlock tier, the cost, and the real-time accrual before mutating the player.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const list = await base44.entities.Player.list('-created_date', 5);
    const player = list?.[0];
    if (!player) return Response.json({ error: 'No player record' }, { status: 404 });

    const businesses = Array.isArray(player.businesses) ? player.businesses : [];
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'collect') {
      // Idle income is bounded by collectableCoins' rank-scaled per-collection
      // cap (IDLE_CAPS) plus the MAX_IDLE_MINUTES 4h accrual ceiling — both of
      // which scale with real wall-clock time and can't be farmed faster than
      // they accrue. The rolling hourly cap belongs to gameplay rounds only;
      // applying it here would silently cut a high-rank collect (up to 24,000)
      // down to ~3,500, making the on-screen "Ready to collect" amount a lie.
      const collected = collectableCoins(businesses, player.lastBusinessCollect || '', player.businessTier || 0);
      const nowIso = new Date().toISOString();
      const update: any = { lastBusinessCollect: nowIso };
      if (collected > 0) update.coins = (player.coins || 0) + collected;
      await base44.asServiceRole.entities.Player.update(player.id, update);
      return Response.json({ player: { ...player, ...update }, collected });
    }

    if (action === 'buy') {
      const tier = Number(body?.tier);
      const unit = getUnit(tier);
      if (!unit) return Response.json({ error: 'Unknown business' }, { status: 400 });
      if ((player.businessTier || 0) < unit.tier) {
        return Response.json({ error: 'Business not unlocked yet' }, { status: 403 });
      }
      const slot = businesses.find((b) => b.tier === tier);
      const owned = slot ? (slot.count || 0) : 0;
      const cost = businessCost(unit, owned);
      if ((player.coins || 0) < cost) {
        return Response.json({ error: 'Not enough dollars', cost }, { status: 400 });
      }
      const nextBusinesses = [...businesses];
      const idx = nextBusinesses.findIndex((b) => b.tier === tier);
      if (idx >= 0) nextBusinesses[idx] = { tier, count: owned + 1 };
      else nextBusinesses.push({ tier, count: 1 });
      const update: any = { coins: (player.coins || 0) - cost, businesses: nextBusinesses };
      // Seed the idle clock on a player's first purchase so their very first
      // collect isn't a cold-start 0 (collectableCoins returns 0 when
      // lastBusinessCollect is empty — leaving new business owners nothing).
      if (!player.lastBusinessCollect) update.lastBusinessCollect = new Date().toISOString();
      await base44.asServiceRole.entities.Player.update(player.id, update);
      return Response.json({ player: { ...player, ...update }, cost, bought: tier });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manage-business error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});