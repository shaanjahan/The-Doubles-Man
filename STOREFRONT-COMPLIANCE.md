# App Store Compliance — Storefront UI Tasks

Three frontend/native-shell tasks for **The Doubles Man**, unrelated to the
Base44 → Supabase backend migration happening in a separate Claude Code
session against the same repo. These don't touch the backend at all —
safe to work on in parallel, no dependency either direction.

## 1. Age rating — App Store Connect, not code

Not a coding task, just a checklist item: in App Store Connect, answer the
age-rating questionnaire honestly. The app has no violent or mature
content, so it should land at **4+** naturally.

**Do not select "Made for Kids."** It's a separate, deliberate toggle —
not automatic at 4+ — and it's a one-way choice that can't be undone once
approved. It also adds real restrictions this app doesn't need: no
purchasing opportunities anywhere except behind a dedicated parental gate.
"For everyone" means a normal 4+ rating, not the Kids Category.

## 2. Purchase confirmation dialog

Add a plain confirmation step before any real-money purchase completes.
Not a parental gate — just a clear native dialog: **"Buy [product name]
for $[price]?"** with Cancel / Confirm. Purpose: cut down on the "my kid
spent money without me knowing" complaint pattern that leads to refund
disputes and bad reviews for games with colorful art + real IAP.

- Applies to every product purchase path in `StorePage.jsx` that calls
  `window.NativeIAP.purchase(...)`
- Show it client-side, right before that call
- Only call `window.NativeIAP.purchase()` on explicit confirm — cancel
  should do nothing

## 3. Loot box odds disclosure — required by Apple guideline 3.1.1, not optional

Apple requires the odds of randomized purchasable items be shown to the
player **before purchase**. This app has exactly that mechanic, and it's
not currently disclosed anywhere in the UI.

**Applies to two purchase paths:**
- The real-money "Mystery Sauce Pack" IAP product
- The in-game "open a sauce pack" feature (`openSaucePack` in
  `usePlayer.js`) — included because it's purchasable with gems, and gems
  are themselves purchasable with real money

**Actual odds — pull these from the game's own `randomSauceIdLite()`
logic, don't invent new numbers:**
- Legendary: 5%
- Epic: 15%
- Rare: 25%
- Common: 55%

**What's needed:** a visible "Drop rates" line or small expandable
section directly on the purchase card for both the IAP product and the
in-game gem pack — not buried in a help page or settings screen.

---

None of this is complex — all three are UI-layer changes. Good candidate
for a session while the backend work is happening elsewhere on a
different part of the same repo.
