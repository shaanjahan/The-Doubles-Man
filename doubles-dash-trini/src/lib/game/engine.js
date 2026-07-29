// Pure helpers for the runtime game loop (no React).
import {
  PEPPER_LEVELS, TOPPING_CHOICES, SAUCE_CHOICES, EXTRA_CHOICES, CUSTOMER_TYPES,
} from './catalog';

export const randint = (n) => Math.floor(Math.random() * n);
export const pick = (arr) => arr[randint(arr.length)];
export function sample(arr, n) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(randint(copy.length), 1)[0]);
  return out;
}

let _cid = 0;

export function generateOrder(complexity, forcePepper) {
  const pepper = forcePepper || pick(PEPPER_LEVELS);
  const toppings = sample(TOPPING_CHOICES, Math.min(randint(complexity + 1), TOPPING_CHOICES.length));
  const sauceCount = complexity >= 2 ? 1 + randint(2) : randint(2);
  const sauces = sample(SAUCE_CHOICES, Math.min(sauceCount, SAUCE_CHOICES.length));
  const extras = sample(EXTRA_CHOICES, complexity >= 3 ? randint(2) : 0);
  return {
    pepper, toppings, sauces, extras,
    requiredIds: ['bara', 'channa', pepper, ...toppings, ...sauces, ...extras],
  };
}

export function spawnCustomer(patienceMult = 1) {
  const type = pick(CUSTOMER_TYPES);
  const base = Math.max(7000, (14000 - type.orderComplexity * 1800) * type.patienceMult);
  const patience = Math.round(base * patienceMult);
  return {
    id: ++_cid,
    type,
    order: generateOrder(type.orderComplexity, type.forcePepper),
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