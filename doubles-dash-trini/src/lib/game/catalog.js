// Central catalog for The Doubles Man — ingredients, customers, sauces,
// business tiers, locations, upgrades, achievements, missions, daily rewards.
// Static data lives here so future expansions (new foods, locations) only touch this file.

export const INGREDIENTS = {
  bara:           { id: 'bara',           label: 'Bara',          emoji: '🫓', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/2fd0b78bb_33E8AE6E-167F-424E-8143-D57BA9D6E8D2.png', palette: { bg: 'bg-amber-200', ring: 'ring-amber-400' } },
  channa:         { id: 'channa',         label: 'Channa',        emoji: '🟡', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/d2ad2ce82_D24158B8-5444-462D-AAF4-8D28CD0594FA.png', palette: { bg: 'bg-yellow-300', ring: 'ring-yellow-500' } },
  pepper_none:    { id: 'pepper_none',    label: 'No Pepper',     emoji: '⚪', palette: { bg: 'bg-slate-200', ring: 'ring-slate-400' } },
  pepper_slight:  { id: 'pepper_slight',  label: 'Slight',        emoji: '🌶️', palette: { bg: 'bg-lime-200',  ring: 'ring-lime-500' } },
  pepper_medium:  { id: 'pepper_medium',  label: 'Medium',        emoji: '🌶️', palette: { bg: 'bg-orange-200', ring: 'ring-orange-500' } },
  pepper_heavy:   { id: 'pepper_heavy',   label: 'Heavy',         emoji: '🔥', palette: { bg: 'bg-red-300',    ring: 'ring-red-500' } },
  tamarind:       { id: 'tamarind',       label: 'Tamarind',      emoji: '🟤', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/2dab4ea2e_3EBEF3DE-DBF0-49EA-9347-F3CBF8FDE44F.PNG', palette: { bg: 'bg-black', ring: 'ring-amber-700' }, onDark: true },
  cucumber:       { id: 'cucumber',       label: 'Cucumber',      emoji: '🥒', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/e0bf7eb60_C1443FB7-E17A-41DF-9EF2-B5A6945491EB.PNG', palette: { bg: 'bg-black', ring: 'ring-green-500' }, onDark: true },
  shadow_beni:    { id: 'shadow_beni',    label: 'Shadow Beni',  emoji: '🌿', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/71168e587_84A075ED-6A14-4D64-99C6-C6C6F37FE65B.PNG', palette: { bg: 'bg-black', ring: 'ring-emerald-500' }, onDark: true },

};

export const PEPPER_LEVELS = ['pepper_none', 'pepper_slight', 'pepper_medium', 'pepper_heavy'];
export const TOPPING_CHOICES = ['cucumber', 'shadow_beni'];
export const SAUCE_CHOICES = ['tamarind'];
export const EXTRA_CHOICES = [];

export const BUSINESS_TIERS = [
  { id: 0, name: 'Doubles Bike',     emoji: '🏍️', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/f3998ba40_C5615C5C-7437-47CA-8E2E-E15D68A8FA44.png', coinMult: 1.0, xpReq: 0,     baseCost: 300,    costGrowth: 1.50, incomePerMin: 2,  perRound: 3 },
  { id: 1, name: 'Doubles Stand',    emoji: '🛒', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/ac997e204_1784D90D-6B0D-4A2F-BFE8-148384171E50.png', coinMult: 1.2, xpReq: 250,   baseCost: 1500,   costGrowth: 1.55, incomePerMin: 6,  perRound: 8 },
  { id: 3, name: 'Roti Shop',        emoji: '🏪', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/ac3495038_D538FA13-5197-4EB7-B4B6-F07D4DDD6F0E.png', coinMult: 1.5, xpReq: 1800,  baseCost: 8000,   costGrowth: 1.60, incomePerMin: 16, perRound: 20 },
  { id: 5, name: 'Doubles Factory',  emoji: '🏭', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/3dfc308c7_4BFD8695-F32F-4C9F-92CE-ABEAAFA5CA05.png', coinMult: 2.2, xpReq: 11000, baseCost: 40000,  costGrowth: 1.65, incomePerMin: 40, perRound: 50 },
  { id: 6, name: 'Doubles Monarch',  emoji: '👑', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/6cd115be2_243B6729-72C2-4B67-B6E2-340AEC2037AE2.png', coinMult: 3.0, xpReq: 26000, baseCost: 180000, costGrowth: 1.70, incomePerMin: 90, perRound: 120 },
];

// Idle "My Business" — owned businesses earn dollars over real time (capped at
// 8h) and add a small per-round bonus when a service round ends. Numbers must
// stay in sync with base44/shared/businesses.ts.
export const MAX_IDLE_MINUTES = 4 * 60;

// Per-collection idle ceiling scales with the vendor's HIGHEST business rank
// (player.businessTier) — Doubles Bike rank → 2,000, Doubles Stand → 3,500,
// and so on. One cap for the whole fleet, not per business owned. Kept in sync
// with base44/shared/businesses.ts.
export const IDLE_CAPS = [2000, 3500, 6500, 12000, 24000];

export function idleCapForTier(businessTier) {
  const i = Math.min(Math.max(Number(businessTier) || 0, 0), IDLE_CAPS.length - 1);
  return IDLE_CAPS[i];
}

export function businessCostFor(tier, owned) {
  const u = BUSINESS_TIERS.find((b) => b.id === tier);
  if (!u) return Infinity;
  return Math.floor(u.baseCost * Math.pow(u.costGrowth, owned));
}

export function businessIncomePerMin(businesses = []) {
  let total = 0;
  for (const b of businesses) {
    const u = BUSINESS_TIERS.find((x) => x.id === b.tier);
    if (u) total += u.incomePerMin * (b.count || 0);
  }
  return total;
}

export function collectableCoins(businesses = [], lastCollectIso, businessTier = 0) {
  if (!lastCollectIso) return 0;
  const last = Date.parse(lastCollectIso);
  if (Number.isNaN(last)) return 0;
  const mins = Math.max(0, (Date.now() - last) / 60000);
  const raw = Math.floor(businessIncomePerMin(businesses) * Math.min(mins, MAX_IDLE_MINUTES));
  return Math.min(raw, idleCapForTier(businessTier));
}

export function businessPerRoundBonus(businesses = []) {
  let total = 0;
  for (const b of businesses) {
    const u = BUSINESS_TIERS.find((x) => x.id === b.tier);
    if (u) total += u.perRound * (b.count || 0);
  }
  return total;
}

export const LOCATIONS = [
  { id: 0, name: 'San Fernando',            emoji: '🏙️', unlockTier: 0, baseReward: 6,  arriveSec: 4.4 },
  { id: 1, name: 'Chaguanas Market',         emoji: '🛍️', unlockTier: 1, baseReward: 8,  arriveSec: 4.0 },
  { id: 2, name: 'Port of Spain',            emoji: '🌆', unlockTier: 2, baseReward: 11, arriveSec: 3.8 },
  { id: 3, name: 'Maracas Beach',            emoji: '🏖️', unlockTier: 3, baseReward: 15, arriveSec: 3.6 },
  { id: 4, name: 'Debe',                    emoji: '🛺', unlockTier: 4, baseReward: 20, arriveSec: 3.4 },
  { id: 5, name: "Queen's Park Savannah",    emoji: '🌴', unlockTier: 5, baseReward: 28, arriveSec: 3.2 },
  { id: 6, name: 'Caribbean Empire Hub',     emoji: '👑', unlockTier: 6, baseReward: 40, arriveSec: 3.0 },
  { id: 7, name: 'Princes Town',             emoji: '🏘️', unlockTier: 3, baseReward: 13, arriveSec: 3.7 },
];

export const CUSTOMER_TYPES = [
  { id: 'office_worker',  name: 'Office Worker',         emoji: '🧑‍💼', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/44423ebc9_85252971-F976-4941-B8CD-C11D5BC19288.png', patienceMult: 1.0, tipMult: 1.0, orderComplexity: 2, walkSpeed: 1.0 },
  { id: 'tourist',        name: 'Tourist',               emoji: '🧳',   image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/e0bf33c77_A1F7A89E-3041-4592-BCF0-C8605A7B0068.png', patienceMult: 1.4, tipMult: 1.5, orderComplexity: 3, walkSpeed: 0.7 },
  { id: 'executive',      name: 'Business Executive',    emoji: '🤵',   image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/6a787573f_DBED3BED-39C7-4516-A6C0-2F651730A4EE.png', patienceMult: 0.8, tipMult: 2.0, orderComplexity: 3, walkSpeed: 0.9 },
  { id: 'teacher',        name: 'Teacher',               emoji: '🧑‍🏫', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/225fdf90b_AEA62FD9-DDB2-441D-A54D-3C104E51F80B.png', patienceMult: 1.2, tipMult: 1.0, orderComplexity: 2, walkSpeed: 0.9 },
  { id: 'student',        name: 'Student',               emoji: '🎒',   image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/088d284b2_7DA08040-0D59-4B09-9495-1C6F526FD3D0.png', patienceMult: 0.7, tipMult: 0.6, orderComplexity: 1, walkSpeed: 1.4 },
  { id: 'student_girl',   name: 'Schoolgirl',            emoji: '🎒',   image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/bf0a5f428_A59B841B-B066-4FE1-81BF-7A2BD364E8A5.png', patienceMult: 0.7, tipMult: 0.6, orderComplexity: 1, walkSpeed: 1.4 },
  { id: 'masquerader',    name: 'Carnival Masquerader',   emoji: '🪅',  image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/ee0a4445e_C9931DA0-AD5E-4980-91A3-C43E8B1F4ADE.png', patienceMult: 1.0, tipMult: 1.3, orderComplexity: 3, walkSpeed: 1.1 },
  { id: 'carnival_queen', name: 'Carnival Queen',          emoji: '👑',  image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/2254549c7_76A9E3F3-A049-48BE-9CE4-DDD8EA8E28E7.png', patienceMult: 1.0, tipMult: 1.4, orderComplexity: 3, walkSpeed: 1.0 },
  { id: 'local_girl',     name: 'Drama Gyal',              emoji: '🌶️', challenge: true, forcePepper: 'pepper_heavy', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/f7ccc1f89_BD6B9CAB-0F65-4F46-A2C2-B4C2BBC6ADF7.png', patienceMult: 0.55, tipMult: 3.0, orderComplexity: 3, walkSpeed: 1.6 },
  { id: 'foodie',         name: 'Street Foodie',            emoji: '😋', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/dc9ef151a_3204D52E-22AD-4B9B-B033-1EEC329EABB1.png', patienceMult: 1.1, tipMult: 1.2, orderComplexity: 2, walkSpeed: 1.1 },
  { id: 'trini_girl',     name: 'Trini Gyal',               emoji: '💃', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/f6d138689_A1F7A89E-3041-4592-BCF0-C8605A7B0068.png', patienceMult: 1.2, tipMult: 1.0, orderComplexity: 2, walkSpeed: 1.0 },
];

export const MAGIC_SAUCES = [
  { id: 'golden_tamarind',  name: 'Golden Tamarind',   rarity: 'Rare',      emoji: '🟡', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/bb36eed07_Golden_Tamarind.png', effect: 'coin_double',   description: 'Doubles all dollars earned this round.' },
  { id: 'ghost_pepper',    name: 'Ghost Pepper',       rarity: 'Epic',      emoji: '👻', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/be84480d2_9AE7316C-0167-4E2C-A1EB-1E28032C849F.PNG', effect: 'slow_customers', description: 'Customers arrive 40% slower.' },
  { id: 'carnival_sauce',  name: 'Carnival HOT Sauce',  rarity: 'Rare',      emoji: '🎉', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/fc70cf3c6_3F582558-CE3D-4C70-AA4C-9E50B2AC71A2.png', effect: 'patience_boost', description: 'All customers gain +50% patience.' },
  { id: 'shadow_beni_spirit', name: 'Shadow Beni',      rarity: 'Common', emoji: '🌱', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/1f78a854f_D61078D1-BA10-4CD5-97E8-02664E50B91F.png', effect: 'auto_ingredient', description: 'Auto-completes one ingredient per serve.' },
  { id: 'lucky_sauce',     name: 'Lucky Sauce',        rarity: 'Common',    emoji: '🍀', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/55377e651_3603CB56-3D37-4392-AF95-915E544F12F3.png', effect: 'gem_chance',     description: 'Triple gem drop chance per serve.' },
  { id: 'turbo_sauce',     name: 'Turbo Sauce',        rarity: 'Epic',      emoji: '⚡', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/2cbab0928_10E820B2-881B-4F87-98B7-0AD31D961375.png', effect: 'fast_prep',      description: 'Prep feels instant — no wait between serves.' },
  { id: 'double_trouble',  name: 'Double Trouble',     rarity: 'Legendary', emoji: '💞', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/87d2bf3f7_BA9B8926-09AF-4A0D-8AF9-5DE3B8CD0C9E.png', effect: 'double_serve',   description: 'Each serve scores twice (counts as two serves).' },
  { id: 'pepper_fairy',    name: 'Pepper Fairy',       rarity: 'Common',    emoji: '🧚', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/497859aec_085533C8-7925-4ED3-9D7A-10031E8E3895.png', effect: 'tip_boost',      description: '+30% tips from every customer.' },
];

export const RARITY_STYLE = {
  Common:    { text: 'text-slate-500',  border: 'border-slate-300',  bg: 'bg-slate-50',  glow: 'shadow-slate-200' },
  Rare:      { text: 'text-sky-600',    border: 'border-sky-400',    bg: 'bg-sky-50',    glow: 'shadow-sky-200' },
  Epic:      { text: 'text-purple-600', border: 'border-purple-400', bg: 'bg-purple-50', glow: 'shadow-purple-200' },
  Legendary: { text: 'text-amber-600',  border: 'border-amber-400',  bg: 'bg-amber-50',  glow: 'shadow-amber-300' },
};

export const UPGRADES = [
  { id: 'prep_speed', name: 'Tanty Power',      image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/cf21b9b37_generated_image.png', emoji: '💪', description: '+12% prep flow per level',   baseCost: 250,  growth: 1.9, maxLevel: 8, step: 0.12 },
  { id: 'patience',   name: 'Calypso Music',     image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/2938227f0_generated_image.png', emoji: '🎶', description: '+15% customer patience',     baseCost: 300,  growth: 1.9, maxLevel: 8, step: 0.15 },
  { id: 'tips',       name: 'Polished Tip Jar',  image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/776a13562_generated_image.png', emoji: '💰', description: '+20% tip amounts',            baseCost: 350,  growth: 2.0, maxLevel: 8, step: 0.20 },
  { id: 'coin_mult',  name: 'Brass Cash Box',    image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/0b162e0c7_generated_image.png', emoji: '🏧', description: '+10% dollars per order',        baseCost: 600,  growth: 2.1, maxLevel: 8, step: 0.10 },
  { id: 'xp_mult',    name: 'Recipe Notebook',   image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/03fbb3514_generated_image.png', emoji: '📓', description: '+15% XP per round',           baseCost: 700, growth: 2.1, maxLevel: 8, step: 0.15 },
  { id: 'station',    name: 'Wider Stall',       image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/cc4b8e34e_generated_image.png', emoji: '🪟', description: '+1 active customer slot',     baseCost: 1500, growth: 2.5, maxLevel: 2, step: 1 },
  { id: 'gem_luck',   name: 'Lucky Mango',       emoji: '🥭', description: '+3% gem drop chance per level', baseCost: 900,  growth: 2.0, maxLevel: 5, step: 0.03 },
  { id: 'combo_master', name: 'Fire Shoes',      emoji: '👟', description: '+2% combo bonus per level',       baseCost: 1100, growth: 2.1, maxLevel: 5, step: 0.02 },
  { id: 'auto_bless', name: "Gran's Blessing",  emoji: '🧿', description: '+1 auto-corrected serve per round', baseCost: 1300, growth: 2.3, maxLevel: 3, step: 1 },
];

export function upgradeCost(upg, currentLevel) {
  return Math.floor(upg.baseCost * Math.pow(upg.growth, currentLevel));
}

export const ACHIEVEMENTS = [
  { id: 'serve_100',       emoji: '🛎️', name: 'Hustler',         description: 'Serve 100 customers',         target: 100,      stat: 'customersServed', reward: { coins: 500 } },
  { id: 'serve_1000',      emoji: '🏆', name: 'Vendor Legend',   description: 'Serve 1,000 customers',        target: 1000,     stat: 'customersServed', reward: { gems: 25 } },
  { id: 'perfect_50',      emoji: '✨', name: 'Perfectionist',  description: '50 perfect orders',           target: 50,       stat: 'perfectOrders',   reward: { coins: 300 } },
  { id: 'perfect_250',     emoji: '🌟', name: 'Flawless Hands', description: '250 perfect orders',          target: 250,      stat: 'perfectOrders',   reward: { gems: 20 } },
  { id: 'combo_20',        emoji: '🔥', name: 'Combo King',      description: 'Combo streak of 20',           target: 20,       stat: 'highestCombo',    reward: { gems: 10 } },
  { id: 'combo_50',        emoji: '🌋', name: 'Lava Fingers',    description: 'Combo streak of 50',           target: 50,       stat: 'highestCombo',    reward: { gems: 30 } },
  { id: 'level_10',        emoji: '⭐', name: 'Rising Star',    description: 'Reach Level 10',              target: 10,       stat: 'level',           reward: { coins: 800 } },
  { id: 'level_25',        emoji: '💫', name: 'Local Celebrity', description: 'Reach Level 25',              target: 25,       stat: 'level',           reward: { gems: 25 } },
  { id: 'coins_1m',        emoji: '💵', name: 'Millionaire',     description: 'Earn 1,000,000 lifetime dollars', target: 1000000, stat: 'lifetimeCoins',   reward: { gems: 50 } },
  { id: 'sauce_collector', emoji: '🧂', name: 'Sauce Master',   description: 'Own 5 unique sauces',          target: 5,        stat: 'uniqueSauces',    reward: { gems: 15 } },
  { id: 'streak_7',        emoji: '📅', name: 'Faithful Vendor', description: '7-day login streak',           target: 7,        stat: 'dailyStreak',     reward: { gems: 30 } },
  { id: 'rounds_50',       emoji: '🎲', name: 'Dedicated',       description: 'Play 50 rounds',              target: 50,       stat: 'roundsPlayed',    reward: { coins: 600 } },
];

export const DAILY_MISSION_POOL = [
  { id: 'dm_serve_15',   desc: 'Serve 15 customers',      target: 15,  stat: 'servedToday',     reward: { coins: 100, xp: 50 } },
  { id: 'dm_perfect_5',  desc: 'Serve 5 perfect orders',  target: 5,   stat: 'perfectToday',    reward: { coins: 80, gems: 2 } },
  { id: 'dm_combo_8',    desc: 'Reach a combo of 8',       target: 8,   stat: 'maxComboToday',   reward: { coins: 120, xp: 60 } },
  { id: 'dm_coins_500',  desc: 'Earn 500 dollars today',     target: 500, stat: 'coinsToday',      reward: { gems: 5 } },
  { id: 'dm_play_3',     desc: 'Play 3 rounds',            target: 3,   stat: 'roundsToday',     reward: { coins: 150 } },
  { id: 'dm_use_sauce',  desc: 'Use a Magic Sauce',         target: 1,   stat: 'sauceUsedToday',  reward: { coins: 90, xp: 40 } },
];

export const WEEKLY_MISSION_POOL = [
  { id: 'wm_serve_100', desc: 'Serve 100 customers this week',  target: 100, stat: 'servedWeek',    reward: { coins: 500, gems: 10 } },
  { id: 'wm_invite_2',   desc: 'Invite 2 friends',                target: 2,   stat: 'invitedFriends', reward: { gems: 15 } },
  { id: 'wm_combo_30', desc: 'Combo of 30',                        target: 30,  stat: 'maxComboWeek',  reward: { coins: 400, gems: 8 } },
];

export const MONTHLY_MISSION_POOL = [
  { id: 'mm_serve_500', desc: 'Serve 500 customers this month', target: 500, stat: 'servedMonth', reward: { gems: 40, coins: 2000 } },
];

export const DAILY_REWARDS = [
  { day: 1, coins: 100 },
  { day: 2, coins: 150 },
  { day: 3, coins: 200, xp: 30 },
  { day: 4, gems: 5 },
  { day: 5, coins: 300, xp: 50 },
  { day: 6, magicSauce: 'lucky_sauce' },
  { day: 7, gems: 20, magicSauce: 'golden_tamarind' },
];

export const STORE_PRODUCTS = [
  { id: 'coin_small',   kind: 'coin_pack',  name: 'Money for Waste Man',     emoji: '🪙', price: 0.99,  amount: 1000 },
  { id: 'coin_medium',  kind: 'coin_pack',  name: 'Side Man Money',     emoji: '💰', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/bbf6282e0_925FDC18-3429-4D33-A88E-F883A1531BF9.png', price: 4.99,  amount: 6000, bonus: 500 },
  { id: 'coin_large',   kind: 'coin_pack',  name: 'Rich Man Flex',     emoji: '🏦', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/d296054f0_BE017B94-8A35-48EB-8545-3807BA09F364.png', price: 9.99,  amount: 14000, bonus: 2000 },
  { id: 'gem_small',    kind: 'gem_pack',   name: 'Mother in Law Gift', emoji: '💎', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/622437699_generated_image.png', price: 1.99,  amount: 25 },
  { id: 'gem_medium',   kind: 'gem_pack',   name: 'Side Man Gift',      emoji: '💎', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/622437699_generated_image.png', price: 4.99,  amount: 75, bonus: 10 },
  { id: 'gem_large',    kind: 'gem_pack',   name: 'Rich Gyal Vibes',    emoji: '👑', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/622437699_generated_image.png', price: 19.99, amount: 350, bonus: 80 },
  { id: 'sauce_pack',   kind: 'sauce_pack', name: 'Mystery Sauce Pack', emoji: '🎁', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/18ce2b14d_60AF9741-63B8-4711-AD8C-8FDF51554E73.png', price: 3.99,  amount: 3 },
  { id: 'starter',      kind: 'bundle',     name: 'Yuh Nanny Will Bundle',    emoji: '🥡', image: 'https://media.base44.com/images/public/6a5fd3358a1c9fbb7f503fd5/1e6f68c9d_DCE93FB1-F6D4-4190-A66E-C7BE4E20E7C7.png', price: 4.99,  amount: 0, bundle: { coins: 3000, gems: 15, magicSauce: 'turbo_sauce' } },
  { id: 'vip',          kind: 'vip',        name: 'VIP Vendor Pass',   emoji: '👑', price: 4.99,  amount: 0 },
];

export const REQUIRED_INGREDIENT_TYPE = {
  pepper: 1, sauce: 1, topping: 1, extra: 1,
};

export function randomSauceId(rarityBias = 0) {
  const r = Math.random();
  let bucket;
  if (r < 0.05 - rarityBias * 0.01) bucket = 'Legendary';
  else if (r < 0.2) bucket = 'Epic';
  else if (r < 0.45) bucket = 'Rare';
  else bucket = 'Common';
  const pool = MAGIC_SAUCES.filter(s => s.rarity === bucket);
  return (pool[Math.floor(Math.random() * pool.length)] || MAGIC_SAUCES[0]).id;
}

export function xpForLevel(level) {
  return Math.floor(80 * Math.pow(1.18, level - 1));
}

export function tierForXp(xp) {
  let tier = BUSINESS_TIERS[0];
  for (const t of BUSINESS_TIERS) {
    if (xp >= t.xpReq) tier = t;
  }
  return tier;
}

// businessTier can climb to 5–6 (level thresholds go up to level 32), but the
// BUSINESS_TIERS display array only has 5 entries. Indexing it directly with a
// high tier returned undefined, so pages fell back to BUSINESS_TIERS[0]
// ("Doubles Bike") — making a top-ranked vendor's tier appear to never upgrade.
// Clamp the index to the array so tiers above the last tier show the top tier.
export function tierByIndex(businessTier) {
  const i = Math.min(Math.max(Number(businessTier) || 0, 0), BUSINESS_TIERS.length - 1);
  return BUSINESS_TIERS[i];
}