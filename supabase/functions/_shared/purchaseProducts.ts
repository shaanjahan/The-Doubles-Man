// Server-side real-money product catalog + grant computation. Faithful port of
// the Base44 shared/purchaseProducts.ts (the table apple-iap-verify trusts).
// Product amounts are sourced here, never from the client — the client only
// ever supplies a signed Apple transaction; the server decides what it grants.
//
// The productId in the verified Apple transaction must match an id here (and an
// App Store Connect product). If it doesn't, the purchase is rejected.

import { rollSauces } from './catalog.ts';

export interface PurchaseProduct {
  id: string;
  kind: 'coin_pack' | 'gem_pack' | 'sauce_pack' | 'bundle' | 'vip';
  name: string;
  price: number;
  amount: number;
  bonus?: number;
  bundle?: { coins?: number; gems?: number; magicSauce?: string };
}

export const PURCHASE_PRODUCTS: PurchaseProduct[] = [
  // Coin amounts are priced as time-saved against the tier-scaled hourly cap —
  // keep in sync with catalog.js STORE_PACKS. Already-granted purchases keep
  // the amounts they were granted with (grants are recorded, never recomputed).
  // coin_small / coin_medium: ORIGINAL amounts as submitted to Apple review —
  // grants must match the submitted display. Do not retune without resubmitting.
  { id: 'coin_small',  kind: 'coin_pack',  name: 'Pocket Coins',   price: 0.99,  amount: 1000 },
  { id: 'coin_medium', kind: 'coin_pack',  name: 'Vendor Stash',   price: 4.99,  amount: 6000, bonus: 500 },
  { id: 'coin_large',  kind: 'coin_pack',  name: 'Doubles Tycoon', price: 9.99,  amount: 74000, bonus: 6000 },
  { id: 'gem_small',   kind: 'gem_pack',   name: 'Lil Gem Pouch',  price: 1.99,  amount: 25 },
  { id: 'gem_medium',  kind: 'gem_pack',   name: 'Gem Jar',        price: 4.99,  amount: 75, bonus: 10 },
  { id: 'gem_large',   kind: 'gem_pack',   name: 'Crown of Gems',  price: 19.99, amount: 350, bonus: 80 },
  { id: 'sauce_pack',  kind: 'sauce_pack', name: 'Mystery Sauce Pack', price: 3.99, amount: 3 },
  { id: 'starter',     kind: 'bundle',     name: 'Starter Bundle', price: 4.99,  amount: 0, bundle: { coins: 3000, gems: 15, magicSauce: 'turbo_sauce' } },
  { id: 'vip',         kind: 'vip',        name: 'VIP Vendor Pass', price: 4.99, amount: 0 },
];

export function getProduct(id: string): PurchaseProduct | undefined {
  return PURCHASE_PRODUCTS.find((p) => p.id === id);
}

export interface Grant {
  coins: number;
  gems: number;
  sauceIds: string[];
  vip: boolean;
}

// Deterministic grant deltas for a product (sauce ids rolled server-side).
// Mirrors Base44 applyGrant + the VIP branch in apple-iap-verify.
export function computeGrant(product: PurchaseProduct): Grant {
  const g: Grant = { coins: 0, gems: 0, sauceIds: [], vip: false };
  switch (product.kind) {
    case 'coin_pack':
      g.coins = product.amount + (product.bonus || 0);
      break;
    case 'gem_pack':
      g.gems = product.amount + (product.bonus || 0);
      break;
    case 'sauce_pack':
      g.sauceIds = rollSauces(product.amount);
      break;
    case 'bundle': {
      const b = product.bundle || {};
      g.coins = b.coins || 0;
      g.gems = b.gems || 0;
      if (b.magicSauce) g.sauceIds = [b.magicSauce];
      break;
    }
    case 'vip':
      g.vip = true;
      break;
  }
  return g;
}
