import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { decodeTransaction } from 'npm:app-store-server-api';
import { getProduct, applyGrant, activateVip } from '../../shared/purchaseProducts.ts';

const BUNDLE_ID = 'com.base6a5fd3358a1c9fbb7f503fd5.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const raw = await req.json().catch(() => ({}));
    const body = (raw && typeof raw.body === 'object' && raw.body) ? raw.body : raw;
    const jws = body?.jws ?? raw?.jws;
    if (!jws || typeof jws !== 'string') {
      return Response.json({ error: 'Missing jws', rawBody: JSON.stringify(raw).slice(0, 300) }, { status: 400 });
    }

    // Verifies Apple's certificate chain + signature, returns decoded transaction.
    const tx = await decodeTransaction(jws);

    if (tx.bundleId !== BUNDLE_ID) {
      return Response.json({ error: 'Wrong bundle id' }, { status: 400 });
    }

    const transactionId = String(tx.transactionId);
    const productId = String(tx.productId);
    const product = getProduct(productId);
    if (!product) return Response.json({ error: 'Unknown product: ' + productId }, { status: 400 });

    // Idempotency: one grant per Apple transaction, ever.
    const checkoutId = 'apple_' + transactionId;
    const existing = await base44.asServiceRole.entities.PurchaseOrder.filter({ checkoutId });
    if (existing.length > 0) {
      return Response.json({ ok: true, alreadyGranted: true, transactionId });
    }

    const players = await base44.asServiceRole.entities.Player.filter({ created_by_id: user.id });
    const player = players?.[0];
    if (!player) return Response.json({ error: 'No player profile found' }, { status: 404 });

    // VIP is a one-time, non-consumable unlock; applyGrant deliberately ignores
    // it, so branch on kind and activate VIP permanently here.
    if (product.kind === 'vip') {
      activateVip(player);
    } else {
      applyGrant(player, product);
    }
    await base44.asServiceRole.entities.Player.update(player.id, player);

    await base44.entities.PurchaseOrder.create({
      email: user.email || '',
      checkoutId,
      productId,
      status: 'completed',
      isSubscription: false,
      subscriptionId: '',
      amount: product.price,
    });

    // Return the updated player so the store page can refresh instantly.
    return Response.json({
      ok: true,
      granted: productId,
      transactionId,
      player,
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});