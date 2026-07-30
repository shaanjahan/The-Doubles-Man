// ===== The Doubles Man — Game Data =====
// Central config: ingredients, customers, locations, magic sauces, upgrades, levels.

export const INGREDIENTS = [
  { id: "bara", name: "Bara", emoji: "🫓", color: "#D4A05A", slot: "bread" },
  { id: "channa", name: "Channa", emoji: "🫘", color: "#D9A441", slot: "base" },
  { id: "pepper_none", name: "No Pepper", emoji: "🚫", color: "#94A3B8", slot: "pepper" },
  { id: "pepper_slight", name: "Slight Pepper", emoji: "🌶️", color: "#84CC16", slot: "pepper" },
  { id: "pepper_medium", name: "Medium Pepper", emoji: "🌶️🌶️", color: "#F97316", slot: "pepper" },
  { id: "pepper_heavy", name: "Heavy Pepper", emoji: "🔥🌶️", color: "#DC2626", slot: "pepper" },
  { id: "sweet_sauce", name: "Sweet Sauce", emoji: "🍯", color: "#FACC15", slot: "sauce" },
  { id: "tamarind_sauce", name: "Tamarind", emoji: "🟤", color: "#92400E", slot: "sauce" },
  { id: "cucumber", name: "Cucumber", emoji: "🥒", color: "#65A30D", slot: "topping" },
  { id: "shadow_beni", name: "Shadow Beni", emoji: "🌿", color: "#16A34A", slot: "topping" },
  { id: "extra_channa", name: "Extra Channa", emoji: "➕🫘", color: "#B45309", slot: "extra" },
  { id: "extra_bara", name: "Extra Bara", emoji: "➕🫓", color: "#A16207", slot: "extra" },
];

export const INGREDIENT_MAP = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Generate a random doubles order: bara + channa + a pepper level + optional toppings
export function generateOrder(complexity = 1) {
  const order = ["bara", "channa"];
  const pepperLevels = ["pepper_none", "pepper_slight", "pepper_medium", "pepper_heavy"];
  order.push(pepperLevels[Math.floor(Math.random() * pepperLevels.length)]);
  const toppings = ["sweet_sauce", "tamarind_sauce", "cucumber", "shadow_beni", "extra_channa", "extra_bara"];
  const shuffled = [...toppings].sort(() => Math.random() - 0.5);
  const topCount = Math.min(complexity + Math.floor(Math.random() * 2), shuffled.length);
  order.push(...shuffled.slice(0, topCount));
  return order.sort((a, b) => slotOrder(a) - slotOrder(b));
}

function slotOrder(id) {
  const slot = INGREDIENT_MAP[id]?.slot;
  return { bread: 0, base: 1, pepper: 2, sauce: 3, topping: 4, extra: 5 }[slot] ?? 9;
}

// Orders compared as sorted arrays — ignores tap sequence, rewards accurate ingredient set.
export function compareOrders(built, target) {
  const a = [...built].sort();
  const b = [...target].sort();
  if (a.length !== b.length) return a.every((x) => b.includes(x)) ? "good" : "wrong";
  const exact = a.every((x, i) => x === b[i]);
  if (exact) return "perfect";
  const allIncluded = b.every((x) => a.includes(x));
  return allIncluded ? "good" : "wrong";
}

export const CUSTOMER_TYPES = [
  { id: "office_worker", name: "Office Worker", emoji: "👔", speed: 1.0, patience: 1.0, tip: 1.0, complexity: 1 },
  { id: "taxi_driver", name: "Taxi Driver", emoji: "🚕", speed: 1.2, patience: 0.85, tip: 1.1, complexity: 1 },
  { id: "construction_worker", name: "Construction Worker", emoji: "👷", speed: 0.9, patience: 1.15, tip: 1.0, complexity: 2 },
  { id: "police_officer", name: "Police Officer", emoji: "👮", speed: 1.0, patience: 1.0, tip: 1.15, complexity: 2 },
  { id: "teacher", name: "Teacher", emoji: "👩‍🏫", speed: 0.95, patience: 1.1, tip: 1.05, complexity: 2 },
  { id: "student", name: "Student", emoji: "🎒", speed: 1.1, patience: 0.9, tip: 0.85, complexity: 1 },
  { id: "tourist", name: "Tourist", emoji: "📷", speed: 0.85, patience: 1.2, tip: 1.3, complexity: 2 },
  { id: "business_exec", name: "Executive", emoji: "💼", speed: 1.15, patience: 0.8, tip: 1.5, complexity: 3 },
  { id: "masquerader", name: "Masquerader", emoji: "🎭", speed: 0.9, patience: 1.25, tip: 1.4, complexity: 3 },
  { id: "football_fan", name: "Football Fan", emoji: "⚽", speed: 1.05, patience: 0.95, tip: 1.0, complexity: 1 },
  { id: "senior_citizen", name: "Senior", emoji: "🧓", speed: 0.75, patience: 1.4, tip: 1.1, complexity: 1 },
  { id: "food_critic", name: "Food Critic", emoji: "📝", speed: 1.0, patience: 0.95, tip: 2.5, complexity: 3, vip: true },
];

export const LOCATIONS = [
  { id: "roadside_cart", name: "Roadside Cart", city: "Sando Back Road", emoji: "🏝️", unlockLevel: 1, tierIcon: "🛒" },
  { id: "improved_cart", name: "Improved Cart", city: "Chaguanas Main Road", emoji: "🛒", unlockLevel: 4, tierIcon: "🛺" },
  { id: "food_truck", name: "Food Truck", city: "Port of Spain", emoji: "🚚", unlockLevel: 8, tierIcon: "🚚" },
  { id: "doubles_shop", name: "Doubles Shop", city: "San Fernando", emoji: "🏪", unlockLevel: 13, tierIcon: "🏪" },
  { id: "restaurant", name: "Restaurant", city: "Queen's Park Savannah", emoji: "🍽️", unlockLevel: 18, tierIcon: "🏛️" },
  { id: "franchise", name: "Regional Franchise", city: "Tobago", emoji: "🌴", unlockLevel: 24, tierIcon: "🏢" },
  { id: "empire", name: "Caribbean Empire", city: "Maracas Bay", emoji: "👑", unlockLevel: 30, tierIcon: "👑" },
];

export const BUSINESS_TIERS = [
  { tier: 0, name: "Doubles Bike", emoji: "🏍️", image: "/game/f3998ba40_C5615C5C-7437-47CA-8E2E-E15D68A8FA44.webp", cost: 0 },
  { tier: 1, name: "Doubles Stand", emoji: "🛒", image: "/game/ac997e204_1784D90D-6B0D-4A2F-BFE8-148384171E50.webp", cost: 3000 },
  { tier: 3, name: "Roti Shop", emoji: "🏪", image: "/game/ac3495038_D538FA13-5197-4EB7-B4B6-F07D4DDD6F0E.webp", cost: 20000 },
  { tier: 5, name: "Doubles Factory", emoji: "🏭", image: "/game/3dfc308c7_4BFD8695-F32F-4C9F-92CE-ABEAAFA5CA05.webp", cost: 180000 },
  { tier: 6, name: "Doubles Monarch", emoji: "👑", image: "/game/6cd115be2_243B6729-72C2-4B67-B6E2-340AEC2037AE2.webp", cost: 500000 },
];

export const MAGIC_SAUCES = [
  { id: "golden_tamarind", name: "Golden Tamarind", emoji: "🟡", image: "/game/bb36eed07_Golden_Tamarind.webp", rarity: "epic", desc: "Double coins earned this round." },
  { id: "ghost_pepper", name: "Ghost Pepper Sauce", emoji: "👻", image: "/game/be84480d2_9AE7316C-0167-4E2C-A1EB-1E28032C849F.webp", rarity: "rare", desc: "Slows customer arrivals." },
  { id: "carnival_sauce", name: "Carnival HOT Sauce", emoji: "🎉", image: "/game/fc70cf3c6_3F582558-CE3D-4C70-AA4C-9E50B2AC71A2.webp", rarity: "rare", desc: "Makes everyone happier (more patience)." },
  { id: "shadow_beni_spirit", name: "Shadow Beni", emoji: "✨", image: "/game/1f78a854f_D61078D1-BA10-4CD5-97E8-02664E50B91F.webp", rarity: "epic", desc: "Auto-completes one ingredient per order." },
  { id: "lucky_sauce", name: "Lucky Sauce", emoji: "🍀", image: "/game/55377e651_3603CB56-3D37-4392-AF95-915E544F12F3.webp", rarity: "common", desc: "Higher gem rewards." },
  { id: "turbo_sauce", name: "Turbo Sauce", emoji: "⚡", image: "/game/2cbab0928_10E820B2-881B-4F87-98B7-0AD31D961375.webp", rarity: "rare", desc: "Preparation speed doubles." },
  { id: "double_trouble", name: "Double Trouble", emoji: "💞", image: "/game/87d2bf3f7_BA9B8926-09AF-4A0D-8AF9-5DE3B8CD0C9E.webp", rarity: "legendary", desc: "Serve two customers at once." },
  { id: "pepper_fairy", name: "Pepper Fairy", emoji: "🧚", image: "/game/497859aec_085533C8-7925-4ED3-9D7A-10031E8E3895.webp", rarity: "common", desc: "+30% tips from every customer." },
];

export const RARITY_STYLES = {
  common: { ring: "ring-slate-300", bg: "bg-slate-100", label: "text-slate-500", glow: "" },
  rare: { ring: "ring-tropic-sea", bg: "bg-cyan-50", label: "text-tropic-teal", glow: "shadow-[0_0_18px_hsl(190_80%_42%/0.35)]" },
  epic: { ring: "ring-tropic-purple", bg: "bg-purple-50", label: "text-tropic-purple", glow: "shadow-[0_0_22px_hsl(257_65%_58%/0.4)]" },
  legendary: { ring: "ring-tropic-gold", bg: "bg-amber-50", label: "text-tropic-gold", glow: "shadow-[0_0_28px_hsl(39_90%_58%/0.5)]" },
};

export const UPGRADES = [
  { id: "prepSpeed", name: "Sharp Knife", emoji: "🔪", desc: "Faster preparation animation.", baseCost: 120, max: 10, effect: (lvl) => `+${lvl * 8}% speed` },
  { id: "tipMultiplier", name: "Golden Smile", emoji: "😊", desc: "Customers leave bigger tips.", baseCost: 200, max: 10, effect: (lvl) => `+${lvl * 10}% tips` },
  { id: "patienceBoost", name: "Cool Breeze", emoji: "🌬️", desc: "Customers wait longer.", baseCost: 160, max: 10, effect: (lvl) => `+${lvl * 6}% patience` },
  { id: "coinMultiplier", name: "Coin Magnet", emoji: "🧲", desc: "Earn more coins per order.", baseCost: 300, max: 10, effect: (lvl) => `+${lvl * 12}% coins` },
  { id: "xpMultiplier", name: "Wisdom Pepper", emoji: "🌶️", desc: "Gain XP faster.", baseCost: 250, max: 10, effect: (lvl) => `+${lvl * 12}% XP` },
  { id: "servingStation", name: "Big Pot", emoji: "🍲", desc: "Larger prep — fewer mistakes.", baseCost: 400, max: 8, effect: (lvl) => `+${lvl} slots` },
];

export function upgradeCost(baseCost, currentLevel) {
  return Math.round(baseCost * Math.pow(1.6, currentLevel));
}

// XP needed to reach the NEXT level from current level.
export function xpForLevel(level) {
  return Math.round(80 * Math.pow(1.35, level - 1));
}

// Build a level config from player's overall level (difficulty scales smoothly).
export function buildLevelConfig(level) {
  return {
    level,
    customersTarget: Math.min(8 + Math.floor(level * 1.3), 30),
    timeLimit: 60 + level * 4,
    spawnInterval: Math.max(4.2 - level * 0.08, 1.6),
    baseReward: 12 + level * 2,
    complexity: Math.min(1 + Math.floor(level / 4), 3),
    rushChance: Math.min(0.1 + level * 0.01, 0.4),
  };
}

export const DAILY_REWARDS = [
  { day: 1, reward: { type: "coins", amount: 100 } },
  { day: 2, reward: { type: "coins", amount: 250 } },
  { day: 3, reward: { type: "gems", amount: 2 } },
  { day: 4, reward: { type: "coins", amount: 500 } },
  { day: 5, reward: { type: "sauce", sauceId: "lucky_sauce" } },
  { day: 6, reward: { type: "gems", amount: 5 } },
  { day: 7, reward: { type: "mystery", amount: 1000 } },
];

export const ACHIEVEMENTS = [
  { id: "serve_100", name: "Hundred Strong", desc: "Serve 100 customers.", icon: "🙌", target: (s) => s.stats.customersServed },
  { id: "serve_1000", name: "Doubles Legend", desc: "Serve 1,000 customers.", icon: "🏆", target: (s) => s.stats.customersServed },
  { id: "perfect_50", name: "Perfectionist", desc: "50 perfect orders.", icon: "✨", target: (s) => s.stats.perfectOrders },
  { id: "combo_15", name: "Combo Master", desc: "Reach a 15x combo.", icon: "🔥", target: (s) => s.stats.highestCombo },
  { id: "million", name: "Millionaire Vendor", desc: "Earn 1,000,000 coins lifetime.", icon: "💰", target: (s) => s.stats.lifetimeEarnings },
  { id: "level_10", name: "Rising Star", desc: "Reach Level 10.", icon: "⭐", target: (s) => s.stats.levelsCompleted },
  { id: "level_30", name: "Empire Builder", desc: "Complete 30 levels.", icon: "👑", target: (s) => s.stats.levelsCompleted },
];

export const RANDOM_EVENTS = [
  { id: "carnival", name: "Carnival Time!", emoji: "🎭", desc: "All tips doubled!" },
  { id: "rainstorm", name: "Rainstorm", emoji: "🌧️", desc: "Fewer customers, but they wait longer." },
  { id: "rush_hour", name: "Rush Hour", emoji: "⏰", desc: "Customers arrive fast!" },
  { id: "food_critic", name: "Food Critic", emoji: "📝", desc: "A VIP critic is coming — impress them!" },
  { id: "double_coins", name: "Double Coin Weekend", emoji: "🪙", desc: "Double coins all round!" },
];