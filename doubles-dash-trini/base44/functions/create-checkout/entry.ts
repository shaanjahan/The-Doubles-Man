import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { getProduct } from '../../shared/purchaseProducts.ts';

// Allowlist of origins the checkout may redirect buyers back to. Strict
// exact-string match only (no substring/includes/regex/wildcards) so a
// spoofed host like thedoublesman.com.evil.com cannot slip through.
const ALLOWED_ORIGINS: string[] = [
  'https://thedoublesman.com',
  'https://www.thedoublesman.com',
];

function isAllowedRedirect(origin: string): boolean {
  if (!origin || origin === 'null') return false;
  const normalized = origin.replace(/\/$/, '');
  // Exact equality against the list — nothing looser.
  return ALLOWED_ORIGINS.includes(normalized);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const raw = await req.json().catch(() => ({}));
    const body = (raw && typeof raw.body === 'object' && raw.body) ? raw.body : raw;
    const productId = body?.productId ?? body?.product_id ?? raw?.productId ?? null;
    const product = getProduct(productId);
    if (!product) {
      return Response.json({
        error: 'Unknown product',
        received: productId,
        rawBody: JSON.stringify(raw).slice(0, 300),
      }, { status: 400 });
    }
    if (product.price < 0.50) {
      return Response.json({ error: 'Minimum charge is $0.50 USD' }, { status: 400 });
    }

    // Do NOT trust the client Origin/referer unchecked — an attacker can set it
    // to redirect a paying buyer to a malicious site. Validate it first.
    const origin = (req.headers.get('Origin') || req.headers.get('referer') || '').replace(/\/$/, '');
    if (!isAllowedRedirect(origin)) {
      return Response.json({ error: 'Redirect origin not allowed', received: origin }, { status: 400 });
    }
    const postFlowUrl = origin;
    const thankYouUrl = origin + '/order-complete';

    const item: any = {
      name: product.kind === 'vip' ? 'VIP Vendor Pass — Lifetime Access' : product.name,
      quantity: 1,
      price: product.price.toFixed(2),
    };

    const cart = {
      items: [item],
      customerInfo: { email: user.email, firstName: user.full_name || '' },
    };

    const apiResponse = await fetch(
      'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: Deno.env.get('WIX_PAYMENTS_API_KEY') || '',
          'wix-site-id': Deno.env.get('WIX_PAYMENTS_SITE_ID') || '',
        },
        body: JSON.stringify({ cart, callbackUrls: { postFlowUrl, thankYouPageUrl: thankYouUrl } }),
      }
    );
    const data = await apiResponse.json();
    if (!apiResponse.ok) {
      console.error('Wix checkout error:', JSON.stringify(data));
      return Response.json({ error: data?.message || 'Checkout failed' }, { status: 502 });
    }

    const checkoutId = data.checkoutSession.id;
    const redirectUrl = data.checkoutSession.redirectUrl;

    // Persist a pending order so the webhook can correlate by checkoutId and grant rewards.
    await base44.asServiceRole.entities.PurchaseOrder.create({
      email: user.email || '',
      checkoutId,
      productId: product.id,
      status: 'pending',
      isSubscription: !!product.recurring,
      amount: product.price,
    });

    return Response.json({ redirectUrl, checkoutId });
  } catch (error) {
    console.error('create-checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});