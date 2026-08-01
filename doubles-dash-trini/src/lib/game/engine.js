// Pure helpers for the runtime game loop (no React).
import {
  PEPPER_LEVELS, TOPPING_CHOICES, SAUCE_CHOICES, EXTRA_CHOICES, CUSTOMER_TYPES,
} from './catalog';

// All generation helpers accept an optional rng (defaults to Math.random) so
// the Daily Challenge can run the SAME logic deterministically.
export const randint = (n, rng = Math.random) => Math.floor(rng() * n);
export const pick = (arr, rng = Math.random) => arr[randint(arr.length, rng)];
export function sample(arr, n, rng = Math.random) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(randint(copy.length, rng), 1)[0]);
  return out;
}

// Deterministic PRNG (mulberry32) for the Daily Challenge: customer #i of day
// D is a pure function of (D, i), so every player faces the identical sequence
// of customers/orders regardless of device, timing, or play speed.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// daySeed: numeric YYYYMMDD (UTC). index: 0-based spawn counter in the round.
export function challengeRng(daySeed, index) {
  return mulberry32((daySeed * 1000003 + index * 7919) | 0);
}

let _cid = 0;

export function generateOrder(complexity, forcePepper, rng = Math.random) {
  const pepper = forcePepper || pick(PEPPER_LEVELS, rng);
  const toppings = sample(TOPPING_CHOICES, Math.min(randint(complexity + 1, rng), TOPPING_CHOICES.length), rng);
  const sauceCount = complexity >= 2 ? 1 + randint(2, rng) : randint(2, rng);
  const sauces = sample(SAUCE_CHOICES, Math.min(sauceCount, SAUCE_CHOICES.length), rng);
  const extras = sample(EXTRA_CHOICES, complexity >= 3 ? randint(2, rng) : 0, rng);
  return {
    pepper, toppings, sauces, extras,
    requiredIds: ['bara', 'channa', pepper, ...toppings, ...sauces, ...extras],
  };
}

export function spawnCustomer(patienceMult = 1, rng = Math.random) {
  const type = pick(CUSTOMER_TYPES, rng);
  const base = Math.max(7000, (14000 - type.orderComplexity * 1800) * type.patienceMult);
  const patience = Math.round(base * patienceMult);
  return {
    id: ++_cid,
    type,
    order: generateOrder(type.orderComplexity, type.forcePepper, rng),
    patience,
    maxPatience: patience,
    challenge: !!type.challenge,
    left: false,
    served: false,
  };
}

export function classifyServe(prepIds, requirementIds) {
  const a = [...prepIds].sort().join('|');
  const b = [...requirementIds].sort().join('|');
  return a === b ? 'perfect' : 'wrong';
}