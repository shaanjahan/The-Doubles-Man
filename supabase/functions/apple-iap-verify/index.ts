// supabase/functions/apple-iap-verify/index.ts
//
// Real Apple StoreKit purchase verification + grant. Supabase port of the
// Base44 apple-iap-verify. The web-preview grantIAP simulator (client-side,
// grants currency with no payment) is DELETED, not ported.
//
// StoreKit rules preserved (see MIGRATION.md):
//   * The signed JWS transaction is verified server-side (Apple cert chain +
//     signature) before anything is granted.
//   * The grant is durable and EXACTLY-ONCE: idempotency-record insert + the
//     currency grant happen in one transaction (apple_iap_grant_apply), keyed
//     on the Apple transactionId. Consumables have no restore path, so a
//     replayed/duplicated transaction must never double-grant.
//   * This returns ok:true only AFTER the grant is committed. The client calls
//     window.NativeIAP.finish(transactionId) only after ok — never before.
//
// appAccountToken: verify-if-present (bind to the player) but NOT required —
// the native purchase() layer doesn't set it yet. Full binding is a tracked
// two-part follow-up (native must set it; backend must then require it).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';
import { decodeTransaction } from 'npm:app-store-server-api@1.0.0';
import { getProduct, computeGrant } from '../_shared/purchaseProducts.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// The app's bundle id. Defaults to the Base44-generated value; override via the
// APPLE_BUNDLE_ID secret if the shipped wrapper uses a different bundle id
// (MUST match, or every real purchase is rejected as "Wrong bundle id").
const BUNDLE_ID = Deno.env.get('APPLE_BUNDLE_ID') ?? 'com.base6a5fd3358a1c9fbb7f503fd5.app';

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

    const raw = await req.json().catch(() => ({}));
    const body = (raw && typeof raw.body === 'object' && raw.body) ? raw.body : raw;
    const jws = body?.jws ?? raw?.jws;
    if (!jws || typeof jws !== 'string') {
      return Response.json({ error: 'Missing jws' }, { status: 400 });
    }

    // Verify Apple's cert chain + signature. Any failure => reject (never grant).
    // Each rejection is logged with its reason so the Dashboard function logs
    // show exactly why a live purchase bounced (the client only sees a generic
    // non-2xx otherwise).
    let tx: any;
    try {
      tx = await decodeTransaction(jws);
    } catch (e) {
      console.error('iap reject: signature verify failed:', e instanceof Error ? e.message : String(e));
      return Response.json({ error: 'Invalid transaction signature' }, { status: 400 });
    }

    console.log('iap tx: bundle=%s product=%s env=%s txid=%s', tx.bundleId, tx.productId, tx.environment, tx.transactionId);

    if (tx.bundleId !== BUNDLE_ID) {
      console.error('iap reject: wrong bundle id:', tx.bundleId, 'expected', BUNDLE_ID);
      return Response.json({ error: 'Wrong bundle id' }, { status: 400 });
    }

    // appAccountToken: verify-if-present (bind the transaction to this player).
    // Not required — the native layer doesn't set it yet.
    if (tx.appAccountToken && String(tx.appAccountToken).toLowerCase() !== user.id.toLowerCase()) {
      return Response.json({ error: 'appAccountToken mismatch' }, { status: 403 });
    }

    const transactionId = String(tx.transactionId);
    const productId = String(tx.productId);
    const product = getProduct(productId);
    if (!product) {
      console.error('iap reject: unknown product:', productId);
      return Response.json({ error: 'Unknown product: ' + productId }, { status: 400 });
    }

    const grant = computeGrant(product);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: applied, error: rpcErr } = await admin.rpc('apple_iap_grant_apply', {
      p_user_id: user.id,
      p_checkout_id: 'apple_' + transactionId,
      p_product_id: productId,
      p_amount: product.price,
      p_coins: grant.coins,
      p_gems: grant.gems,
      p_sauce_ids: grant.sauceIds,
      p_vip: grant.vip,
    });
    if (rpcErr) throw rpcErr;
    if (applied?.error === 'no_player') return Response.json({ error: 'No player record' }, { status: 404 });
    if (!applied || applied.error) {
      console.error('iap reject: grant failed:', applied?.error);
      return Response.json({ error: applied?.error || 'grant failed' }, { status: 500 });
    }

    return Response.json({
      ok: true,
      granted: applied.alreadyGranted ? undefined : productId,
      alreadyGranted: !!applied.alreadyGranted,
      transactionId,
      player: toClientPlayer(applied.player, applied.stats),
    });
  } catch (error) {
    console.error('apple-iap-verify error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
