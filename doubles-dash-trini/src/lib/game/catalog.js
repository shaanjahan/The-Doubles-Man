// Central catalog for The Doubles Man — ingredients, customers, sauces,
// business tiers, locations, upgrades, achievements, missions, daily rewards.
// Static data lives here so future expansions (new foods, locations) only touch this file.

export const INGREDIENTS = {
  bara:           { id: 'bara',           label: 'Bara',          emoji: '🫓', image: '/game/2fd0b78bb_33E8AE6E-167F-424E-8143-D57BA9D6E8D2.webp', palette: { bg: 'bg-amber-200', ring: 'ring-amber-400' } },
  channa:         { id: 'channa',         label: 'Channa',        emoji: '🟡', image: '/game/d2ad2ce82_D24158B8-5444-462D-AAF4-8D28CD0594FA.webp', palette: { bg: 'bg-yellow-300', ring: 'ring-yellow-500' } },
  pepper_none:    { id: 'pepper_none',    label: 'No Pepper',     emoji: '⚪', palette: { bg: 'bg-slate-200', ring: 'ring-slate-400' } },
  pepper_slight:  { id: 'pepper_slight',  label: 'Slight',        emoji: '🌶️', palette: { bg: 'bg-lime-200',  ring: 'ring-lime-500' } },
  pepper_medium:  { id: 'pepper_medium',  label: 'Medium',        emoji: '🌶️', palette: { bg: 'bg-orange-200', ring: 'ring-orange-500' } },
  pepper_heavy:   { id: 'pepper_heavy',   label: 'Heavy',         emoji: '🔥', palette: { bg: 'bg-red-300',    ring: 'ring-red-500' } },
  tamarind:       { id: 'tamarind',       label: 'Tamarind',      emoji: '🟤', image: '/game/2dab4ea2e_3EBEF3DE-DBF0-49EA-9347-F3CBF8FDE44F.webp', palette: { bg: 'bg-black', ring: 'ring-amber-700' }, onDark: true },
  cucumber:       { id: 'cucumber',       label: 'Cucumber',      emoji: '🥒', image: '/game/e0bf7eb60_C1443FB7-E17A-41DF-9EF2-B5A6945491EB.webp', palette: { bg: 'bg-black', ring: 'ring-green-500' }, onDark: true },
  shadow_beni:    { id: 'shadow_beni',    label: 'Shadow Beni',  emoji: '🌿', image: '/game/71168e587_84A075ED-6A14-4D64-99C6-C6C6F37FE65B.webp', palette: { bg: 'bg-black', ring: 'ring-emerald-500' }, onDark: true },

};

export const PEPPER_LEVELS = ['pepper_none', 'pepper_slight', 'pepper_medium', 'pepper_heavy'];
export const TOPPING_CHOICES = ['cucumber', 'shadow_beni'];
export const SAUCE_CHOICES = ['tamarind'];
export const EXTRA_CHOICES = [];

export const BUSINESS_TIERS = [
  { id: 0, name: 'Doubles Bike',     emoji: '🏍️', image: '/game/f3998ba40_C5615C5C-7437-47CA-8E2E-E15D68A8FA44.webp', coinMult: 1.0, xpReq: 0,     baseCost: 300,    costGrowth: 1.50, incomePerMin: 2,  perRound: 3 },
  { id: 1, name: 'Doubles Stand',    emoji: '🛒', image: '/game/ac997e204_1784D90D-6B0D-4A2F-BFE8-148384171E50.webp', coinMult: 1.2, xpReq: 250,   baseCost: 1500,   costGrowth: 1.55, incomePerMin: 6,  perRound: 8 },
  { id: 3, name: 'Roti Shop',        emoji: '🏪', image: '/game/ac3495038_D538FA13-5197-4EB7-B4B6-F07D4DDD6F0E.webp', coinMult: 1.5, xpReq: 1800,  baseCost: 8000,   costGrowth: 1.60, incomePerMin: 16, perRound: 20 },
  { id: 5, name: 'Doubles Factory',  emoji: '🏭', image: '/game/3dfc308c7_4BFD8695-F32F-4C9F-92CE-ABEAAFA5CA05.webp', coinMult: 2.2, xpReq: 11000, baseCost: 40000,  costGrowth: 1.65, incomePerMin: 40, perRound: 50 },
  { id: 6, name: 'Doubles Monarch',  emoji: '👑', image: '/game/6cd115be2_243B6729-72C2-4B67-B6E2-340AEC2037AE2.webp', coinMult: 3.0, xpReq: 26000, baseCost: 180000, costGrowth: 1.70, incomePerMin: 90, perRound: 120 },
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

// Per-collection ceiling = IDLE_CAP_PCT of the fleet's invested value (the
// exact businessNetValue the Empire Value board ranks) — "your stalls hold up
// to 1% of your empire's value". Old tier cap stays as a floor so new players
// keep 2,000+ and nobody's ceiling ever decreases. Mirror of _shared/businesses.ts.
export const IDLE_CAP_PCT = 0.01;

export function businessNetValue(businesses = []) {
  let total = 0;
  for (const b of businesses) {
    const u = BUSINESS_TIERS.find((x) => x.id === b?.tier);
    if (!u) continue;
    const count = Math.max(0, Math.floor(b.count || 0));
    for (let k = 0; k < count; k++) total += Math.floor(u.baseCost * Math.pow(u.costGrowth, k));
  }
  return total;
}

export function fleetIdleCap(businesses = [], businessTier = 0) {
  const pctCap = Math.floor(businessNetValue(businesses) * IDLE_CAP_PCT);
  return Math.max(idleCapForTier(businessTier), pctCap);
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
  return Math.min(raw, fleetIdleCap(businesses, businessTier));
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
  { id: 'office_worker',  name: 'Office Worker',         emoji: '🧑‍💼', image: '/game/44423ebc9_85252971-F976-4941-B8CD-C11D5BC19288.webp', patienceMult: 1.0, tipMult: 1.0, orderComplexity: 2, walkSpeed: 1.0 },
  { id: 'tourist',        name: 'Tourist',               emoji: '🧳',   image: '/game/e0bf33c77_A1F7A89E-3041-4592-BCF0-C8605A7B0068.webp', patienceMult: 1.4, tipMult: 1.5, orderComplexity: 3, walkSpeed: 0.7 },
  { id: 'executive',      name: 'Business Executive',    emoji: '🤵',   image: '/game/6a787573f_DBED3BED-39C7-4516-A6C0-2F651730A4EE.webp', patienceMult: 0.8, tipMult: 2.0, orderComplexity: 3, walkSpeed: 0.9 },
  { id: 'teacher',        name: 'Teacher',               emoji: '🧑‍🏫', image: '/game/225fdf90b_AEA62FD9-DDB2-441D-A54D-3C104E51F80B.webp', patienceMult: 1.2, tipMult: 1.0, orderComplexity: 2, walkSpeed: 0.9 },
  { id: 'student',        name: 'Student',               emoji: '🎒',   image: '/game/088d284b2_7DA08040-0D59-4B09-9495-1C6F526FD3D0.webp', patienceMult: 0.7, tipMult: 0.6, orderComplexity: 1, walkSpeed: 1.4 },
  { id: 'student_girl',   name: 'Schoolgirl',            emoji: '🎒',   image: '/game/bf0a5f428_A59B841B-B066-4FE1-81BF-7A2BD364E8A5.webp', patienceMult: 0.7, tipMult: 0.6, orderComplexity: 1, walkSpeed: 1.4 },
  { id: 'masquerader',    name: 'Carnival Masquerader',   emoji: '🪅',  image: '/game/ee0a4445e_C9931DA0-AD5E-4980-91A3-C43E8B1F4ADE.webp', patienceMult: 1.0, tipMult: 1.3, orderComplexity: 3, walkSpeed: 1.1 },
  { id: 'carnival_queen', name: 'Carnival Queen',          emoji: '👑',  image: '/game/2254549c7_76A9E3F3-A049-48BE-9CE4-DDD8EA8E28E7.webp', patienceMult: 1.0, tipMult: 1.4, orderComplexity: 3, walkSpeed: 1.0 },
  { id: 'local_girl',     name: 'Drama Gyal',              emoji: '🌶️', challenge: true, forcePepper: 'pepper_heavy', image: '/game/f7ccc1f89_BD6B9CAB-0F65-4F46-A2C2-B4C2BBC6ADF7.webp', patienceMult: 0.55, tipMult: 3.0, orderComplexity: 3, walkSpeed: 1.6 },
  { id: 'foodie',         name: 'Street Foodie',            emoji: '😋', image: '/game/dc9ef151a_3204D52E-22AD-4B9B-B033-1EEC329EABB1.webp', patienceMult: 1.1, tipMult: 1.2, orderComplexity: 2, walkSpeed: 1.1 },
  { id: 'trini_girl',     name: 'Trini Gyal',               emoji: '💃', image: '/game/f6d138689_A1F7A89E-3041-4592-BCF0-C8605A7B0068.webp', patienceMult: 1.2, tipMult: 1.0, orderComplexity: 2, walkSpeed: 1.0 },
];

export const MAGIC_SAUCES = [
  { id: 'golden_tamarind',  name: 'Golden Tamarind',   rarity: 'Rare',      emoji: '🟡', image: '/game/bb36eed07_Golden_Tamarind.webp', effect: 'coin_double',   description: 'Doubles all dollars earned this round.' },
  { id: 'ghost_pepper',    name: 'Ghost Pepper',       rarity: 'Epic',      emoji: '👻', image: '/game/be84480d2_9AE7316C-0167-4E2C-A1EB-1E28032C849F.webp', effect: 'slow_customers', description: 'Customers arrive 40% slower.' },
  { id: 'carnival_sauce',  name: 'Carnival HOT Sauce',  rarity: 'Rare',      emoji: '🎉', image: '/game/fc70cf3c6_3F582558-CE3D-4C70-AA4C-9E50B2AC71A2.webp', effect: 'patience_boost', description: 'All customers gain +50% patience.' },
  { id: 'shadow_beni_spirit', name: 'Shadow Beni',      rarity: 'Common', emoji: '🌱', image: '/game/1f78a854f_D61078D1-BA10-4CD5-97E8-02664E50B91F.webp', effect: 'auto_ingredient', description: 'Auto-completes one ingredient per serve.' },
  { id: 'lucky_sauce',     name: 'Lucky Sauce',        rarity: 'Common',    emoji: '🍀', image: '/game/55377e651_3603CB56-3D37-4392-AF95-915E544F12F3.webp', effect: 'gem_chance',     description: 'Triple gem drop chance per serve.' },
  { id: 'turbo_sauce',     name: 'Turbo Sauce',        rarity: 'Epic',      emoji: '⚡', image: '/game/2cbab0928_10E820B2-881B-4F87-98B7-0AD31D961375.webp', effect: 'fast_prep',      description: 'Prep feels instant — no wait between serves.' },
  { id: 'double_trouble',  name: 'Double Trouble',     rarity: 'Legendary', emoji: '💞', image: '/game/87d2bf3f7_BA9B8926-09AF-4A0D-8AF9-5DE3B8CD0C9E.webp', effect: 'double_serve',   description: 'Each serve scores twice (counts as two serves).' },
  { id: 'pepper_fairy',    name: 'Pepper Fairy',       rarity: 'Common',    emoji: '🧚', image: '/game/497859aec_085533C8-7925-4ED3-9D7A-10031E8E3895.webp', effect: 'tip_boost',      description: '+30% tips from every customer.' },
];

export const RARITY_STYLE = {
  Common:    { text: 'text-slate-500',  border: 'border-slate-300',  bg: 'bg-slate-50',  glow: 'shadow-slate-200' },
  Rare:      { text: 'text-sky-600',    border: 'border-sky-400',    bg: 'bg-sky-50',    glow: 'shadow-sky-200' },
  Epic:      { text: 'text-purple-600', border: 'border-purple-400', bg: 'bg-purple-50', glow: 'shadow-purple-200' },
  Legendary: { text: 'text-amber-600',  border: 'border-amber-400',  bg: 'bg-amber-50',  glow: 'shadow-amber-300' },
};

export const UPGRADES = [
  { id: 'prep_speed', name: 'Tanty Power',      image: '/game/cf21b9b37_generated_image.webp', emoji: '💪', description: '+12% prep flow per level',   baseCost: 250,  growth: 1.9, maxLevel: 8, step: 0.12 },
  { id: 'patience',   name: 'Calypso Music',     image: '/game/2938227f0_generated_image.webp', emoji: '🎶', description: '+15% customer patience',     baseCost: 300,  growth: 1.9, maxLevel: 8, step: 0.15 },
  { id: 'tips',       name: 'Polished Tip Jar',  image: '/game/776a13562_generated_image.webp', emoji: '💰', description: '+20% tip amounts',            baseCost: 350,  growth: 2.0, maxLevel: 8, step: 0.20 },
  { id: 'coin_mult',  name: 'Brass Cash Box',    image: '/game/0b162e0c7_generated_image.webp', emoji: '🏧', description: '+10% dollars per order',        baseCost: 600,  growth: 2.1, maxLevel: 8, step: 0.10 },
  { id: 'xp_mult',    name: 'Recipe Notebook',   image: '/game/03fbb3514_generated_image.webp', emoji: '📓', description: '+15% XP per round',           baseCost: 700, growth: 2.1, maxLevel: 8, step: 0.15 },
  { id: 'station',    name: 'Wider Stall',       image: '/game/cc4b8e34e_generated_image.webp', emoji: '🪟', description: '+1 active customer slot',     baseCost: 1500, growth: 2.5, maxLevel: 2, step: 1 },
  { id: 'gem_luck',   name: 'Lucky Mango',       emoji: '🥭', description: '+3% gem drop chance per level', baseCost: 900,  growth: 2.0, maxLevel: 5, step: 0.03 },
  { id: 'combo_master', name: 'Fire Shoes',      emoji: '👟', description: '+2% combo bonus per level',       baseCost: 1100, growth: 2.1, maxLevel: 5, step: 0.02 },
  { id: 'auto_bless', name: "Gran's Blessing",  emoji: '🧿', description: '+1 auto-corrected serve per round', baseCost: 1300, growth: 2.3, maxLevel: 3, step: 1 },
  // Endless-horizon coin sink: keeps coins meaningful after the tier/upgrade
  // ladder is maxed (late-game money otherwise accumulates with nothing to
  // buy). Costs 500k and roughly triples per level. Mirror in
  // supabase/functions/_shared/catalog.ts.
  { id: 'legacy',     name: 'Doubles Legacy',   emoji: '👑', description: '+2% dollars per level — forever', baseCost: 500000, growth: 2.8, maxLevel: 10, step: 0.02 },
];

export function upgradeCost(upg, currentLevel) {
  return Math.floor(upg.baseCost * Math.pow(upg.growth, currentLevel));
}

// Every achievement pays BOTH dollars and gems, set by its difficulty tier.
// Mirrors _shared/catalog.ts ACH_TIER_PRIZE — the server is authoritative for
// the actual grant; this copy is display-only.
export const ACH_TIER_PRIZE = {
  starter:   { coins: 500,    gems: 2 },
  easy:      { coins: 1500,   gems: 5 },
  medium:    { coins: 5000,   gems: 10 },
  hard:      { coins: 20000,  gems: 20 },
  veryhard:  { coins: 75000,  gems: 40 },
  legendary: { coins: 250000, gems: 75 },
};

export const ACH_TIER_META = {
  starter:   { label: 'Starter',   badge: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  easy:      { label: 'Easy',      badge: 'bg-sky-100 text-sky-700 border-sky-300' },
  medium:    { label: 'Medium',    badge: 'bg-amber-100 text-amber-700 border-amber-300' },
  hard:      { label: 'Hard',      badge: 'bg-orange-100 text-orange-700 border-orange-300' },
  veryhard:  { label: 'Very Hard', badge: 'bg-red-100 text-red-700 border-red-300' },
  legendary: { label: 'Legendary', badge: 'bg-purple-100 text-purple-700 border-purple-300' },
};

const ACH_DEFS = [
  // -- Starter --
  { id: 'serve_10',        emoji: '🥇', name: 'First Taste',        description: 'Serve 10 customers',              target: 10,        stat: 'customersServed', tier: 'starter' },
  { id: 'serve_100',       emoji: '🛎️', name: 'Hustler',            description: 'Serve 100 customers',             target: 100,       stat: 'customersServed', tier: 'starter' },
  { id: 'perfect_10',      emoji: '🤲', name: 'Clean Hands',        description: '10 perfect orders',               target: 10,        stat: 'perfectOrders',   tier: 'starter' },
  { id: 'combo_10',        emoji: '⚡', name: 'Warm Up',            description: 'Combo streak of 10',              target: 10,        stat: 'highestCombo',    tier: 'starter' },
  { id: 'level_5',         emoji: '🌱', name: 'Fresh Start',        description: 'Reach Level 5',                   target: 5,         stat: 'level',           tier: 'starter' },
  { id: 'rounds_5',        emoji: '🎮', name: 'Getting Started',    description: 'Play 5 rounds',                   target: 5,         stat: 'roundsPlayed',    tier: 'starter' },
  { id: 'streak_3',        emoji: '📆', name: 'Regular Visitor',    description: '3-day login streak',              target: 3,         stat: 'dailyStreak',     tier: 'starter' },
  { id: 'biz_1',           emoji: '🏪', name: 'Side Hustle',        description: 'Own your first business',         target: 1,         stat: 'businessesOwned', tier: 'starter' },
  { id: 'upgrade_1',       emoji: '🔧', name: 'Better Tools',       description: 'Buy your first upgrade',          target: 1,         stat: 'upgradesOwned',   tier: 'starter' },
  // -- Easy --
  { id: 'serve_500',       emoji: '🧾', name: 'Street Regular',     description: 'Serve 500 customers',             target: 500,       stat: 'customersServed', tier: 'easy' },
  { id: 'perfect_50',      emoji: '✨', name: 'Perfectionist',      description: '50 perfect orders',               target: 50,        stat: 'perfectOrders',   tier: 'easy' },
  { id: 'combo_20',        emoji: '🔥', name: 'Combo King',         description: 'Combo streak of 20',              target: 20,        stat: 'highestCombo',    tier: 'easy' },
  { id: 'level_10',        emoji: '⭐', name: 'Rising Star',        description: 'Reach Level 10',                  target: 10,        stat: 'level',           tier: 'easy' },
  { id: 'coins_10k',       emoji: '💰', name: 'First Stash',        description: 'Earn 10,000 lifetime dollars',    target: 10000,     stat: 'lifetimeCoins',   tier: 'easy' },
  { id: 'rounds_50',       emoji: '🎲', name: 'Dedicated',          description: 'Play 50 rounds',                  target: 50,        stat: 'roundsPlayed',    tier: 'easy' },
  { id: 'streak_7',        emoji: '📅', name: 'Faithful Vendor',    description: '7-day login streak',              target: 7,         stat: 'dailyStreak',     tier: 'easy' },
  { id: 'sauce_3',         emoji: '🥫', name: 'Sauce Starter',      description: 'Own 3 unique sauces',             target: 3,         stat: 'uniqueSauces',    tier: 'easy' },
  { id: 'upgrade_5',       emoji: '🛠️', name: 'Fully Equipped',     description: 'Own 5 different upgrades',        target: 5,         stat: 'upgradesOwned',   tier: 'easy' },
  { id: 'invite_1',        emoji: '🤝', name: 'Bring a Friend',     description: 'Invite a friend',                 target: 1,         stat: 'invitedFriends',  tier: 'easy' },
  // -- Medium --
  { id: 'serve_1000',      emoji: '🏆', name: 'Vendor Legend',      description: 'Serve 1,000 customers',           target: 1000,      stat: 'customersServed', tier: 'medium' },
  { id: 'perfect_250',     emoji: '🌟', name: 'Flawless Hands',     description: '250 perfect orders',              target: 250,       stat: 'perfectOrders',   tier: 'medium' },
  { id: 'combo_50',        emoji: '🌋', name: 'Lava Fingers',       description: 'Combo streak of 50',              target: 50,        stat: 'highestCombo',    tier: 'medium' },
  { id: 'level_25',        emoji: '💫', name: 'Local Celebrity',    description: 'Reach Level 25',                  target: 25,        stat: 'level',           tier: 'medium' },
  { id: 'coins_100k',      emoji: '🏦', name: 'Big Saver',          description: 'Earn 100,000 lifetime dollars',   target: 100000,    stat: 'lifetimeCoins',   tier: 'medium' },
  { id: 'rounds_150',      emoji: '🕰️', name: 'Seasoned Vendor',    description: 'Play 150 rounds',                 target: 150,       stat: 'roundsPlayed',    tier: 'medium' },
  { id: 'streak_14',       emoji: '🗓️', name: 'Two-Week Faithful',  description: '14-day login streak',             target: 14,        stat: 'dailyStreak',     tier: 'medium' },
  { id: 'sauce_collector', emoji: '🧂', name: 'Sauce Master',       description: 'Own 5 unique sauces',             target: 5,         stat: 'uniqueSauces',    tier: 'medium' },
  { id: 'biz_5',           emoji: '🏘️', name: 'Small Chain',        description: 'Own 5 businesses',                target: 5,         stat: 'businessesOwned', tier: 'medium' },
  { id: 'upgrade_max',     emoji: '🚀', name: 'Top of De Line',     description: 'Max out any upgrade',             target: 1,         stat: 'upgradeMaxed',    tier: 'medium' },
  { id: 'invite_3',        emoji: '📣', name: 'Town Crier',         description: 'Invite 3 friends',                target: 3,         stat: 'invitedFriends',  tier: 'medium' },
  { id: 'vip_member',      emoji: '🎩', name: 'De Big Shot',        description: 'Become a VIP member',             target: 1,         stat: 'vip',             tier: 'medium' },
  // -- Hard --
  { id: 'serve_2500',      emoji: '🎪', name: 'Crowd Favourite',    description: 'Serve 2,500 customers',           target: 2500,      stat: 'customersServed', tier: 'hard' },
  { id: 'perfect_1000',    emoji: '🎯', name: 'Zero Wrong Moves',   description: '1,000 perfect orders',            target: 1000,      stat: 'perfectOrders',   tier: 'hard' },
  { id: 'combo_100',       emoji: '🌪️', name: 'Hurricane Hands',    description: 'Combo streak of 100',             target: 100,       stat: 'highestCombo',    tier: 'hard' },
  { id: 'level_50',        emoji: '🎓', name: 'Top of De Class',    description: 'Reach Level 50',                  target: 50,        stat: 'level',           tier: 'hard' },
  { id: 'coins_1m',        emoji: '💵', name: 'Millionaire',        description: 'Earn 1,000,000 lifetime dollars', target: 1000000,   stat: 'lifetimeCoins',   tier: 'hard' },
  { id: 'rounds_300',      emoji: '🔁', name: 'De Grinder',         description: 'Play 300 rounds',                 target: 300,       stat: 'roundsPlayed',    tier: 'hard' },
  { id: 'streak_30',       emoji: '🌙', name: 'Month-Long Devotion', description: '30-day login streak',            target: 30,        stat: 'dailyStreak',     tier: 'hard' },
  { id: 'sauce_8',         emoji: '🌶️', name: 'Full Pantry',        description: 'Own all 8 magic sauces',          target: 8,         stat: 'uniqueSauces',    tier: 'hard' },
  { id: 'biz_10',          emoji: '🏙️', name: 'Business District',  description: 'Own 10 businesses',               target: 10,        stat: 'businessesOwned', tier: 'hard' },
  { id: 'empire_1',        emoji: '🏰', name: 'Empire Builder',     description: 'Own a Doubles Monarch',           target: 1,         stat: 'empireUnits',     tier: 'hard' },
  // -- Very Hard --
  { id: 'serve_5000',      emoji: '🏛️', name: 'Doubles Institution', description: 'Serve 5,000 customers',          target: 5000,      stat: 'customersServed', tier: 'veryhard' },
  { id: 'combo_250',       emoji: '☄️', name: 'Comet Streak',       description: 'Combo streak of 250',             target: 250,       stat: 'highestCombo',    tier: 'veryhard' },
  { id: 'coins_10m',       emoji: '🤑', name: 'Money Boss',         description: 'Earn 10,000,000 lifetime dollars', target: 10000000,  stat: 'lifetimeCoins',   tier: 'veryhard' },
  { id: 'rounds_500',      emoji: '🏋️', name: 'Iron Vendor',        description: 'Play 500 rounds',                 target: 500,       stat: 'roundsPlayed',    tier: 'veryhard' },
  { id: 'legacy_1',        emoji: '📜', name: 'Start De Legacy',    description: 'Buy Doubles Legacy Level 1',      target: 1,         stat: 'legacyLevel',     tier: 'veryhard' },
  // -- Legendary --
  { id: 'serve_10000',     emoji: '👑', name: 'National Treasure',  description: 'Serve 10,000 customers',          target: 10000,     stat: 'customersServed', tier: 'legendary' },
  { id: 'combo_500',       emoji: '🐉', name: 'Untouchable',        description: 'Combo streak of 500',             target: 500,       stat: 'highestCombo',    tier: 'legendary' },
  { id: 'coins_100m',      emoji: '🐋', name: 'Doubles Tycoon',     description: 'Earn 100,000,000 lifetime dollars', target: 100000000, stat: 'lifetimeCoins',   tier: 'legendary' },
  { id: 'legacy_5',        emoji: '🏺', name: 'Living Legacy',      description: 'Doubles Legacy Level 5',          target: 5,         stat: 'legacyLevel',     tier: 'legendary' },
];

export const ACHIEVEMENTS = ACH_DEFS.map((d) => ({ ...d, reward: ACH_TIER_PRIZE[d.tier] }));

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

// Mystery Sauce Pack drop odds, per sauce (each of the 3 rolls independently).
// MUST mirror the server's rarity buckets in
// supabase/functions/_shared/catalog.ts randomSauceId():
//   r < 0.05 Legendary | r < 0.20 Epic | r < 0.45 Rare | else Common.
// Displayed wherever the pack is sold — Apple guideline 3.1.1 requires odds
// disclosure for paid randomized items before purchase.
export const SAUCE_PACK_ODDS = [
  { rarity: 'Common',    pct: 55 },
  { rarity: 'Rare',      pct: 25 },
  { rarity: 'Epic',      pct: 15 },
  { rarity: 'Legendary', pct: 5 },
];

export const STORE_PRODUCTS = [
  // Coin pack sizing: priced as TIME SAVED against the tier-scaled hourly cap
  // (see finalize_round_apply), not as early-game token amounts — $4.99 skips
  // roughly a third of a day of late-game grind. Amounts must stay in sync with
  // supabase/functions/_shared/purchaseProducts.ts (the server grant table).
  // coin_small / coin_medium keep their ORIGINAL amounts — these two were
  // submitted to Apple review with these values; displayed/granted amounts
  // must match that submission. Do not retune without resubmitting.
  { id: 'coin_small',   kind: 'coin_pack',  name: 'Money for Waste Man',     emoji: '🪙', price: 0.99,  amount: 1000 },
  { id: 'coin_medium',  kind: 'coin_pack',  name: 'Side Man Money',     emoji: '💰', image: '/game/bbf6282e0_925FDC18-3429-4D33-A88E-F883A1531BF9.webp', price: 4.99,  amount: 6000, bonus: 500 },
  { id: 'coin_large',   kind: 'coin_pack',  name: 'Rich Man Flex',     emoji: '🏦', image: '/game/d296054f0_BE017B94-8A35-48EB-8545-3807BA09F364.webp', price: 9.99,  amount: 74000, bonus: 6000 },
  { id: 'gem_small',    kind: 'gem_pack',   name: 'Mother in Law Gift', emoji: '💎', image: '/game/622437699_generated_image.webp', price: 1.99,  amount: 25 },
  { id: 'gem_medium',   kind: 'gem_pack',   name: 'Side Man Gift',      emoji: '💎', image: '/game/622437699_generated_image.webp', price: 4.99,  amount: 75, bonus: 10 },
  { id: 'gem_large',    kind: 'gem_pack',   name: 'Rich Gyal Vibes',    emoji: '👑', image: '/game/622437699_generated_image.webp', price: 19.99, amount: 350, bonus: 80 },
  { id: 'sauce_pack',   kind: 'sauce_pack', name: 'Mystery Sauce Pack', emoji: '🎁', image: '/game/18ce2b14d_60AF9741-63B8-4711-AD8C-8FDF51554E73.webp', price: 3.99,  amount: 3 },
  { id: 'starter',      kind: 'bundle',     name: 'Yuh Nanny Will Bundle',    emoji: '🥡', image: '/game/1e6f68c9d_DCE93FB1-F6D4-4190-A66E-C7BE4E20E7C7.webp', price: 4.99,  amount: 0, bundle: { coins: 3000, gems: 15, magicSauce: 'turbo_sauce' } },
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