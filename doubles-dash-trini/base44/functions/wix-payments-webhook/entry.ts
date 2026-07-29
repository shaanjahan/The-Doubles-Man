import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import jwt from 'npm:jsonwebtoken@9.0.2';
import { getProduct, applyGrant, activateVip } from '../../shared/purchaseProducts.ts';
import { boostHourlyCap, HOURLY_CAP_PURCHASE_THRESHOLD } from '../../shared/hourlyCap.ts';

Deno.serve(async (req) => {
  try {
    const publicKey = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
    if (!publicKey) {
      console.error('Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
      return Response.json({ error: 'Missing public key' }, { status: 500 });
    }

    const requestBody = await req.text();
    let rawPayload: any;
    try {
      rawPayload = jwt.verify(requestBody, publicKey, { algorithms: ['RS256'] });
    } catch (e) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);
    const base44 = createClientFromRequest(req);

    if (event.eventType === 'wix.ecom.v1.order_approved') {
      const order = eventData.actionEvent.body.order;
      const checkoutId = order.checkoutId;
      const pending = await base44.asServiceRole.entities.PurchaseOrder.filter({ checkoutId });
      const po = pending && pending[0];
      if (!po) return Response.json({ ok: true, note: 'no matching order' });
      // Wix retries webhook deliveries; a completed order must never be granted twice.
      if (po.status === 'completed') return Response.json({ ok: true, note: 'already processed' });

      const players = await base44.asServiceRole.entities.Player.filter({ created_by_id: po.created_by_id });
      const player = players && players[0];
      if (player) {
        const product = getProduct(po.productId);
        if (product) {
          if (product.kind === 'vip') {
            activateVip(player);
          } else {
            applyGrant(player, product);
          }
          if (product.price >= HOURLY_CAP_PURCHASE_THRESHOLD) boostHourlyCap(player);
          await base44.asServiceRole.entities.Player.update(player.id, player);
        }
      }

      let subscriptionId = '';
      for (const li of order.lineItems) if (li.subscriptionInfo) subscriptionId = li.subscriptionInfo.id;
      await base44.asServiceRole.entities.PurchaseOrder.update(po.id, { status: 'completed', subscriptionId });
      return Response.json({ ok: true });
    }

    return Response.json({ ok: true, note: 'unhandled event type' });
  } catch (error) {
    console.error('webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});