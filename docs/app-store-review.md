# App Store Connect — review submission pack

Everything the App Store Connect side of the submission needs, drafted to match
what the app actually does (verified against the code, 2026-07-30). Copy-paste
from here.

## 1. App Review Information → Notes (paste this)

> The Doubles Man is a Trinidadian street-food tycoon game we designed and
> built ourselves — all art, game systems, and content are original and owned
> by us. The game engine is our own HTML5/React game served from our domain and
> presented in the app with native integrations: StoreKit 2 for all in-app
> purchases (server-side receipt verification), and Sign in with Apple.
>
> All purchases are one-time consumable IAPs through Apple. There is no
> third-party advertising, no tracking, and no unrestricted web browsing —
> the app displays only our own game.
>
> Demo account (email + password sign-in on the login screen):
>   Email: shaanjahaan@gmail.com
>   Password: (the password you supplied)
>
> The Mystery Sauce Pack is a randomized item; drop odds are disclosed on its
> store listing in-app (Common 55% / Rare 25% / Epic 15% / Legendary 5%).
> Account deletion is available in-app: Hub → Vendor Profile → settings icon →
> Delete Account.

## 2. App Privacy (nutrition labels)

Declare **Data linked to you**, all "App Functionality" purpose, none used for
tracking:

| Data type | Collected? | Linked to identity | Tracking |
|---|---|---|---|
| Contact Info → Email Address | Yes (sign-in) | Yes | No |
| User Content → Other (display name, avatar choice, game progress) | Yes | Yes | No |
| Purchases → Purchase History | Yes (IAP records) | Yes | No |
| Identifiers → User ID | Yes (account id) | Yes | No |
| Diagnostics / Location / Contacts / Browsing / Health / Financial info | No | — | — |

Notes:
- IP addresses appear only in hosting provider security logs (Netlify/Supabase)
  — standard "not collected" treatment is defensible, but if you prefer maximal
  caution declare Diagnostics → Other Diagnostic Data, not linked.
- "Data Used to Track You": **none**. No ATT prompt needed.

## 3. Age rating questionnaire

- Cartoon/fantasy violence, realistic violence, horror, sexual content,
  nudity, profanity: **None**
- Alcohol/tobacco/drugs: **None**
- Simulated gambling: **None** (the sauce pack is a randomized item purchase,
  not gambling; no wagering, no cash-out)
- Contests: **None**
- Unrestricted web access: **No**
- Frequent/intense mature themes: **None**
- Expected result: **4+** (or 9+/12+ only if the current questionnaire's
  in-app-purchase follow-ups bump it; answer honestly that IAP exists).

## 4. What's already handled in the app (for reference)

- 3.1.1 IAP: StoreKit only; store hard-allowlisted to the 6 submitted products
  (`coin_small`, `coin_medium`, `gem_medium`, `gem_large`, `sauce_pack`,
  `starter`); server-side receipt verification (`apple-iap-verify`).
- 3.1.1 loot boxes: odds disclosed pre-purchase in both places the pack is sold.
- 4.8: Sign in with Apple offered alongside Google/email.
- 5.1.1(v): in-app account deletion + email fallback.
- Privacy policy at thedoublesman.com/privacy — current (Supabase/Netlify/
  Resend; Google/Apple/email sign-in only).
- 4.2 wrapper mitigation: inside the iOS app, `/` routes straight into the
  game — the reviewer never sees the marketing landing/site footer. Pinch-zoom,
  long-press callouts, overscroll bounce, and text selection are disabled;
  `viewport-fit=cover` uses the full screen.
- Review demo account exists and its email+password login is verified working.

## 5. Submission-day checklist (your side)

- [ ] Paste §1 into App Review Information → Notes, with the real password.
- [ ] Enter the demo credentials in Sign-In Information.
- [ ] Fill App Privacy per §2.
- [ ] Age rating per §3.
- [ ] Screenshots taken from the real app (not the website).
- [ ] Support URL: thedoublesman.com/support · Privacy URL: /privacy.
