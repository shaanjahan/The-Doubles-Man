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
  // Keep in sync with catalog.js STORE_PRODUCTS AND each product's App Store
  // Connect metadata (display text must never promise a different amount than
  // the grant here). Amounts retuned + big tiers added 2026-08-07 (owner).
  // Already-granted purchases keep the amounts they were granted with (grants
  // are recorded, never recomputed).
  { id: 'coin_small',  kind: 'coin_pack',  name: 'Money for Waste Man',       price: 0.99,  amount: 10000 },
  { id: 'coin_medium', kind: 'coin_pack',  name: 'Side Man Money',            price: 4.99,  amount: 50000 },
  { id: 'coin_large',  kind: 'coin_pack',  name: 'Rich Man Flex',             price: 9.99,  amount: 100000 },
  { id: 'coin_xl',     kind: 'coin_pack',  name: 'Meh Fadda Money',           price: 19.99, amount: 1000000 },
  { id: 'coin_xxl',    kind: 'coin_pack',  name: 'Meh Fadda New Wife Bribe',  price: 29.99, amount: 10000000 },
  { id: 'coin_xxxl',   kind: 'coin_pack',  name: 'Nanny and Nana Inheritance', price: 49.99, amount: 100000000 },
  { id: 'coin_max',    kind: 'coin_pack',  name: 'Sold Meh Grand Fadda Land', price: 99.99, amount: 1000000000 },
  { id: 'gem_small',   kind: 'gem_pack',   name: 'Mother in Law Gift',        price: 1.99,  amount: 75 },
  { id: 'gem_medium',  kind: 'gem_pack',   name: 'Side Man Gift',             price: 4.99,  amount: 175, bonus: 25 },
  { id: 'gem_large',   kind: 'gem_pack',   name: 'Rich Gyal Vibes',           price: 19.99, amount: 500 },
  { id: 'gem_xl',      kind: 'gem_pack',   name: 'Rich Gyal Boyfriend Gift',  price: 29.99, amount: 1000, bonus: 150 },
  { id: 'gem_xxl',     kind: 'gem_pack',   name: 'Spicy Tanty Lux',           price: 39.99, amount: 2000, bonus: 300 },
  { id: 'gem_xxxl',    kind: 'gem_pack',   name: 'Tanty Boyfriend Gift',      price: 59.99, amount: 3500, bonus: 600 },
  { id: 'gem_xxxxl',   kind: 'gem_pack',   name: 'Tanty Second Husband Gift', price: 79.99, amount: 5000 },
  { id: 'gem_max',     kind: 'gem_pack',   name: 'Tanty Ex Ex Husband Gift',  price: 99.99, amount: 10000, bonus: 2000 },
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
