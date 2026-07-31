import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { STORE_PRODUCTS, SAUCE_PACK_ODDS } from '@/lib/game/catalog';
import { Image } from '@/components/ui/image';
import CoinIcon from '@/components/CoinIcon';
import SauceShopSection from '@/components/game/SauceShopSection';
import { Loader2 } from 'lucide-react';

// Hard allowlist: the ONLY products that may ever render in the store. These are
// exactly the in-app purchases submitted to and under review by Apple. Nothing
// outside this set is displayed — not on web, not while StoreKit is loading, and
// not if getProducts() fails — so the app can never show a product that wasn't
// submitted for review. Add an id here only after it's approved in App Store
// Connect. (Catalog still defines coin_large / gem_small / vip so the purchase
// verifier keeps working once/if those are submitted and approved later.)
const APPROVED_PRODUCT_IDS = new Set([
  'coin_small', 'coin_medium', 'gem_medium', 'gem_large', 'sauce_pack', 'starter',
]);

// Surface the real error text wherever we show a failure to the user.
//   - e.response.data.error : Base44 backend function error body (axios
//     rejects on non-2xx, so res?.data?.error is unreachable in a catch).
//   - e.payload.error       : the native StoreKit bridge rejects with an
//     Error carrying the real reason on e.payload.error.
//   - e.message             : plain JS Error fallback.
function errorText(e) {
  const d = e?.response?.data;
  if (d && typeof d === 'object' && !d.error) {
    return JSON.stringify(d).slice(0, 300);
  }
  return (
    d?.error ||
    e?.payload?.error ||
    e?.message ||
    'Something went wrong'
  );
}

// Native Apple IAP (StoreKit) path — the iOS WKWebView shell injects
// window.NativeIAP; verify the signed transaction on the backend, finish it
// with the native layer, then refresh the player's currency/VIP state.
async function buyWithApple(productId, applyPlayer) {
  const { jws, transactionId } = await window.NativeIAP.purchase(productId);
  let res;
  try {
    res = await base44.functions.invoke('apple-iap-verify', { jws });
  } catch (e) {
    throw e; // preserve axios error so the caller's errorText() can read it
  }
  if (res?.data?.ok) {
    await window.NativeIAP.finish(transactionId);
    if (applyPlayer && res.data.player) applyPlayer(res.data.player);
  } else {
    throw new Error(res?.data?.error || 'Purchase verification failed');
  }
}

// Purchase entry: native Apple IAP only. The web Base44 Payments checkout
// (create-checkout) was removed with the Supabase migration — the app ships as
// a native WKWebView shell where window.NativeIAP is always available. A
// 'cancelled' rejection bubbles up so handlers can stay silent (Apple sheet
// closed).
function purchase(productId, applyPlayer) {
  if (window.NativeIAP?.available) {
    return buyWithApple(productId, applyPlayer);
  }
  return Promise.reject(new Error('Purchases are only available in the app.'));
}

function ProductCard({ p, onBuy, applePrice }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function handle() {
    setErr('');
    setBusy(true);
    try {
      await onBuy(p);
    } catch (e) {
      if (errorText(e) !== 'cancelled') setErr(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bg-white rounded-2xl p-3 shadow border border-amber-100 flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden bg-sky-50">
        {p.kind === 'coin_pack' ? (
          p.image ? (
            <Image src={p.image} alt={p.name} className="w-full h-full bg-black object-contain" fittingType="fit" />
          ) : (
            <CoinIcon className="w-full h-full bg-black" fittingType="fit" />
          )
        ) : p.image ? (
          <Image src={p.image} alt={p.name} className="w-full h-full bg-black object-contain" fittingType="fit" />
        ) : (
          <span className="text-2xl">{p.emoji}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-800 text-sm">{p.name}</div>
        <div className="text-[11px] text-slate-500">
          {p.kind === 'coin_pack' && (<span className="inline-flex items-center gap-0.5">{p.amount}{p.bonus ? ` +${p.bonus} bonus` : ''}<CoinIcon className="w-3 h-3 inline-block" /></span>)}
          {p.kind === 'gem_pack' && `${p.amount}${p.bonus ? ` +${p.bonus} bonus` : ''} 💎`}
          {p.kind === 'sauce_pack' && `${p.amount} random sauces`}
          {p.kind === 'bundle' && `Dollars + Gems + Sauce`}
        </div>
        {/* Apple 3.1.1: randomized-item purchases must disclose odds pre-purchase. */}
        {p.kind === 'sauce_pack' && (
          <div className="text-[10px] text-slate-400 mt-0.5">
            Odds per sauce: {SAUCE_PACK_ODDS.map((o) => `${o.rarity} ${o.pct}%`).join(' · ')}
          </div>
        )}
        {err && <div className="text-[10px] text-rose-500 font-bold mt-0.5">{err}</div>}
      </div>
      <button
        onClick={handle}
        disabled={busy}
        className={`px-3 py-1.5 rounded-full text-xs font-extrabold shrink-0 transition ${busy ? 'bg-slate-200 text-slate-500' : 'bg-sky-500 text-white hover:bg-sky-600 active:scale-95'}`}
      >
        {busy ? '…' : (applePrice || `$${p.price.toFixed(2)}`)}
      </button>
    </div>
  );
}

export default function StorePage() {
  const { applyServerPlayer } = usePlayerState();
  const [vipBusy, setVipBusy] = useState(false);
  const [vipErr, setVipErr] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [appleProducts, setAppleProducts] = useState(null);
  const [appleProductsFailed, setAppleProductsFailed] = useState(false);

  // Subscription renewals / interrupted purchases are re-delivered by the
  // native shell via this callback; verify each one against Apple's servers.
  useEffect(() => {
    if (window.NativeIAP?.available) {
      window.onNativeIAPPending = (jws) => base44.functions.invoke('apple-iap-verify', { jws });
    }
  }, []);

  // Pull Apple's real, localized product data from StoreKit so the prices on
  // the tiles match what the user's App Store account will actually charge.
  // A failure here must never blank the store — we just record a diagnostic.
  useEffect(() => {
    if (!window.NativeIAP?.available) return;
    let alive = true;
    (async () => {
      try {
        const result = await window.NativeIAP.getProducts();
        if (!alive) return;
        const list = result?.products || [];
        setAppleProducts(list);
      } catch (e) {
        if (!alive) return;
        setAppleProductsFailed(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Native-only: gate which catalog products render. On web, nothing
  // changes — the full catalog is always shown. On iOS, wait for StoreKit's
  // product list to settle before filtering; if getProducts fails, fall back
  // to showing everything (an empty store is worse than a button that errors).
  const isNative = !!window.NativeIAP?.available;
  const appleProductsSettled = appleProducts !== null || appleProductsFailed;
  const appleLoading = isNative && !appleProductsSettled;
  const getProductsFailed = isNative && appleProductsFailed;
  const visibleAppleIds = Array.isArray(appleProducts) ? appleProducts.map((p) => p.id) : [];
  function productVisible(id) {
    // Hard allowlist wins over everything — an unsubmitted product is never
    // shown, regardless of platform or StoreKit state.
    if (!APPROVED_PRODUCT_IDS.has(id)) return false;
    if (!isNative) return true;
    if (appleLoading) return true;
    if (getProductsFailed) return true;
    return visibleAppleIds.includes(id);
  }

  const buy = (p) => purchase(p.id, applyServerPlayer);
  const applePriceFor = (id) => appleProducts?.find((ap) => ap.id === id)?.price || null;

  async function handleRestore() {
    setRestoreBusy(true);
    setRestoreMsg('');
    try {
      const result = await window.NativeIAP.restore();
      const jwsList = Array.isArray(result) ? result : (result?.entitlements || []);
      if (jwsList.length === 0) {
        setRestoreMsg('No previous purchases found.');
        return;
      }
      let player = null;
      for (const jws of jwsList) {
        const res = await base44.functions.invoke('apple-iap-verify', { jws });
        if (res?.data?.player) player = res.data.player;
      }
      if (player) applyServerPlayer(player);
      setRestoreMsg('Purchases restored.');
    } catch (e) {
      setRestoreMsg(errorText(e));
    } finally {
      setRestoreBusy(false);
    }
  }

  async function handleVip() {
    setVipErr('');
    setVipBusy(true);
    try {
      await purchase('vip', applyServerPlayer);
    } catch (e) {
      if (errorText(e) !== 'cancelled') setVipErr(errorText(e));
    } finally {
      setVipBusy(false);
    }
  }

  const grouped = {
    'Dollar Packs': STORE_PRODUCTS.filter((p) => p.kind === 'coin_pack'),
    'Gem Packs': STORE_PRODUCTS.filter((p) => p.kind === 'gem_pack'),
    Bundles: STORE_PRODUCTS.filter((p) => p.kind === 'bundle' || p.kind === 'sauce_pack'),
  };

  return (
    <div className="max-w-2xl mx-auto px-3 pt-3 pb-6 space-y-4">
      <h1 className="text-3xl font-extrabold text-tropic-coral tracking-wide">Store</h1>
      <p className="text-xs text-white/60">
        Stock your stall with dollars, gems, and rare sauces.{window.NativeIAP?.available ? '' : ' Secure checkout powered by Base44 Payments.'}
      </p>

      {appleLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-xs">Loading store…</span>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([label, list]) => {
            const visibleList = list.filter((p) => productVisible(p.id));
            if (visibleList.length === 0) return null;
            return (
              <section key={label} className="space-y-2">
                <h2 className="text-[11px] uppercase font-extrabold text-amber-700 tracking-wide">{label}</h2>
                {visibleList.map((p) => (
                  <ProductCard key={p.id} p={p} onBuy={buy} applePrice={applePriceFor(p.id)} />
                ))}
              </section>
            );
          })}

          {/* Magic Sauces */}
          <SauceShopSection />

          {/* VIP */}
          {productVisible('vip') && (
            <section className="space-y-2">
              <h2 className="text-[11px] uppercase font-extrabold text-red-600 tracking-wide">VIP Membership</h2>
              <div className="bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-2">
                <div>
                    <div className="font-extrabold text-lg text-yellow-300">VIP Vendor Pass</div>
                    <div className="text-xs text-red-100">Exclusive cosmetics · VIP badge · Leaderboard crown · Yours forever</div>
                </div>
                </div>
                <button
                onClick={handleVip}
                disabled={vipBusy}
                className="mt-3 bg-yellow-300 text-red-800 font-extrabold px-4 py-2 rounded-full w-full hover:scale-[1.02] active:scale-95 transition disabled:opacity-70"
                >
                {vipBusy ? 'Redirecting…' : `Unlock VIP · ${applePriceFor('vip') ? `${applePriceFor('vip')} once` : '$4.99 once'}`}
                </button>
                {vipErr && <div className="text-[11px] text-yellow-100 font-bold mt-2">{vipErr}</div>}
                <p className="text-[10px] text-red-100/90 mt-3 leading-snug">
                One-time lifetime purchase. By purchasing you agree to our{' '}
                <Link to="/terms" className="underline">Terms of Service</Link>{' '}
                and{' '}
                <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </div>
            </section>
          )}
        </>
      )}

      {window.NativeIAP?.available && (
        <div className="mt-2 text-center">
          <button
            onClick={handleRestore}
            disabled={restoreBusy}
            className="text-xs text-slate-500 underline disabled:opacity-50"
          >
            {restoreBusy ? 'Restoring…' : 'Restore Purchases'}
          </button>
          {restoreMsg && (
            <div className="text-[11px] text-slate-400 mt-1">{restoreMsg}</div>
          )}
        </div>
      )}

      <div className="text-center text-[11px] text-white/70 mt-3">
        <Link to="/terms" className="underline hover:text-tropic-gold">Terms of Service</Link>
        {' · '}
        <Link to="/privacy" className="underline hover:text-tropic-gold">Privacy Policy</Link>
      </div>
    </div>
  );
}