// Shared product catalog + grant logic for real-money purchases.
// Mirrors src/lib/game/catalog.js STORE_PRODUCTS for backend use (create-checkout + webhook).

export interface PurchaseProduct {
  id: string;
  kind: 'coin_pack' | 'gem_pack' | 'sauce_pack' | 'bundle' | 'vip';
  name: string;
  emoji: string;
  price: number;
  amount: number;
  bonus?: number;
  bundle?: { coins?: number; gems?: number; magicSauce?: string };
  recurring?: boolean;
}

export const PURCHASE_PRODUCTS: PurchaseProduct[] = [
  { id: 'coin_small',  kind: 'coin_pack',  name: 'Pocket Coins',      emoji: '🪙', price: 0.99,  amount: 1000 },
  { id: 'coin_medium', kind: 'coin_pack',  name: 'Vendor Stash',      emoji: '💰', price: 4.99,  amount: 6000, bonus: 500 },
  { id: 'coin_large',  kind: 'coin_pack',  name: 'Doubles Tycoon',    emoji: '🏦', price: 9.99,  amount: 14000, bonus: 2000 },
  { id: 'gem_small',   kind: 'gem_pack',   name: 'Lil Gem Pouch',     emoji: '💎', price: 1.99,  amount: 25 },
  { id: 'gem_medium',  kind: 'gem_pack',   name: 'Gem Jar',           emoji: '💎', price: 4.99,  amount: 75, bonus: 10 },
  { id: 'gem_large',   kind: 'gem_pack',   name: 'Crown of Gems',     emoji: '👑', price: 19.99, amount: 350, bonus: 80 },
  { id: 'sauce_pack',  kind: 'sauce_pack', name: 'Mystery Sauce Pack', emoji: '🎁', price: 3.99, amount: 3 },
  { id: 'starter',     kind: 'bundle',     name: 'Starter Bundle',    emoji: '🥡', price: 4.99,  amount: 0, bundle: { coins: 3000, gems: 15, magicSauce: 'turbo_sauce' } },
  { id: 'vip',         kind: 'vip',        name: 'VIP Vendor Pass',   emoji: '👑', price: 4.99,  amount: 0 },
];

export function getProduct(id: string): PurchaseProduct | undefined {
  return PURCHASE_PRODUCTS.find((p) => p.id === id);
}

const SAUCE_IDS_BY_RARITY: Record<string, string[]> = {
  Legendary: ['double_trouble'],
  Epic: ['ghost_pepper', 'turbo_sauce'],
  Rare: ['golden_tamarind', 'carnival_sauce'],
  Common: ['shadow_beni_spirit', 'lucky_sauce', 'pepper_fairy'],
};

function addSauce(player: any, sauceId: string, count = 1) {
  if (!player.magicSauces) player.magicSauces = [];
  const slot = player.magicSauces.find((s: any) => s.id === sauceId);
  if (slot) slot.count += count;
  else player.magicSauces.push({ id: sauceId, count });
}

function addRandomSauce(player: any) {
  const r = Math.random();
  let bucket: string;
  if (r < 0.05) bucket = 'Legendary';
  else if (r < 0.2) bucket = 'Epic';
  else if (r < 0.45) bucket = 'Rare';
  else bucket = 'Common';
  const pool = SAUCE_IDS_BY_RARITY[bucket] || SAUCE_IDS_BY_RARITY.Common;
  addSauce(player, pool[Math.floor(Math.random() * pool.length)]);
}

// Apply a one-time product grant to a player object (mutates). VIP handled separately.
export function applyGrant(player: any, product: PurchaseProduct) {
  if (product.kind === 'coin_pack') {
    player.coins = (player.coins || 0) + product.amount + (product.bonus || 0);
  } else if (product.kind === 'gem_pack') {
    player.gems = (player.gems || 0) + product.amount + (product.bonus || 0);
  } else if (product.kind === 'sauce_pack') {
    for (let i = 0; i < product.amount; i++) addRandomSauce(player);
  } else if (product.kind === 'bundle') {
    const b = product.bundle || {};
    if (b.coins) player.coins = (player.coins || 0) + b.coins;
    if (b.gems) player.gems = (player.gems || 0) + b.gems;
    if (b.magicSauce) addSauce(player, b.magicSauce);
  }
}

export function activateVip(player: any) {
  player.vip = true;
}

export function deactivateVip(player: any) {
  player.vip = false;
}