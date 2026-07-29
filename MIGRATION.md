# The Doubles Man — Base44 → Supabase Migration

Handoff doc for continuity across sessions. Paste this as your first message
in a new Claude Code session, or drop it in the repo root and point Claude
Code at it. Update it as work progresses — treat it as ground truth, not a
one-time briefing.

## Local project folder

`/Users/lamaemaharaj/Desktop/Doubles Man` — this is where the repo lives on
disk. Work from here; commits/pushes happen from this folder directly.

## What this app is

iOS game, Trinidadian doubles/street-food theme, domain `thedoublesman.com`.
Originally built on Base44 (AI app builder). Client-side game loop
(`Play.jsx` + `engine.js`), React frontend, native iOS wrapper for App Store
distribution.

## Current status (testers, App Store)

- Under 10 testers, TestFlight only, sandbox purchases only
- Base44-built version submitted for **external Beta App Review** (result
  pending) — also set up an **internal testing group** in parallel for fast
  iteration without waiting on review each build
- Native iOS wrapper: a WKWebView shell that **loads app content from a URL
  at runtime** (not bundled into the binary), with a native StoreKit bridge
  injected as `window.NativeIAP`. Built by the user + desktop Claude,
  specifically to satisfy Apple's native-IAP requirement.
- **Open question, not yet confirmed:** does that WKWebView currently point
  at `thedoublesman.com`, or still at a Base44 domain? If it's already the
  custom domain, backend changes behind it are invisible to Apple forever —
  no new build ever needed for backend work. If it's still a Base44 domain,
  **one more native build is needed** to repoint it — do this early, since
  it has its own review clock.
- Apple things to verify, unconfirmed: Sign in with Apple present if any
  other social login is offered (required if so); `delete-account` reachable
  from the in-app UI (Apple requires in-app deletion, not email).

## Why migrating off Base44

An audit of the exported Base44 code found the `Player` entity's RLS
allowed the owner to update **any** field via direct SDK write — including
`coins`, `gems`, `level`, `businessTier`, `upgrades`. Confirmed in the
actual client code, not just theoretical: `src/lib/game/usePlayer.js`'s
`mutate()`/`persist()` pattern mutates the player object in the browser for
`buyUpgrade`, `claimDaily`, `openSaucePack`, `grantIAP`, and
`trackInvite`, then pushes the whole object straight to the DB via
`Player.update()`. Only `finalizeRound` and `manageBusiness` go through real
backend functions (`finalize-round`, `manage-business`).

Also: Base44 only exports frontend code (GitHub sync, one-way). Backend
functions and entity schemas were copied out by hand, not in the ZIP.
Base44 export used for this migration: `doubles-dash-trini.zip`.

Also flagged: `buySauceWithCoins` in `usePlayer.js` doesn't appear to
deduct the gem/coin cost anywhere — verify and fix.

## Target stack

- **Backend:** Supabase (Postgres + RLS + Edge Functions)
- **Frontend hosting:** Netlify, behind `thedoublesman.com`
- **Errors:** Sentry (not yet wired in)
- Deliberately skipping for now: RevenueCat, Upstash Redis, Cloudflare —
  add only when a real usage metric justifies it, not preemptively

**Migration approach:** strangler pattern. New backend built and tested in
isolation first; the swap is a config change in `src/api/base44Client.js`
(currently the only Base44 SDK entrypoint) pointing at Supabase instead.
Base44 stays live and paid as rollback insurance until the new stack has
run clean for a few weeks — **do not cancel the Base44 plan on the original
schedule.**

**Data:** NOT migrating Base44's CSVs — with under 10 testers and sandbox-
only purchases, recreating accounts by hand is safer than debugging an
import. CSVs exported and kept as schema reference only.

**Kill, don't port:** the `grantIAP` "web-preview" purchase simulator in
`usePlayer.js` grants currency with no payment. No web surface exists
anymore — delete it rather than carrying it into Supabase.

## Supabase project

- Project: "shaanjahan's Project" — `https://zongwrqawgaipabdgmwe.supabase.co`
- GitHub-linked to `shaanjahan/The-Doubles-Man`, `main` branch
- Plan: Free during build-out. **Upgrade to Pro (~$25/mo) around Aug 7–8**,
  before testers depend on it — free tier auto-pauses after 7 days idle,
  and Pro adds daily backups (matters once real purchase records exist).
- Project creation used: Data API enabled, "Automatically expose new
  tables" **disabled**, "Enable automatic RLS" **enabled** — every new
  table starts locked by default.

## Schema — done and verified

Three tables created, RLS enabled on all:

- **`players`** — hot/mutable state. Split into cosmetic columns
  (`display_name`, `avatar_emoji`, `needs_setup`, `has_seen_tutorial` —
  client-writable) and economy columns (`coins`, `gems`, `level`,
  `business_tier`, `upgrades`, etc. — **not** client-writable). Achieved via
  `revoke update ... from authenticated` then `grant update (cosmetic cols
  only) ... to authenticated`. **Verified** via
  `information_schema.column_privileges`: exactly the 4 cosmetic columns
  have UPDATE for `authenticated`, nothing economy-related.
  `unique(user_id)` constraint — makes a duplicate Player row for one user
  impossible (closes the old create-race bug).
  No INSERT policy at all — rows are only created by a `service_role`
  Edge Function, never directly by a client.
- **`player_stats`** — lifetime counters, separate table so they're not
  rewritten wholesale on every round the way the old Base44 Player doc was.
- **`earnings_log`** — append-only, for the hourly-earnings-cap check
  (this existed in Base44's code but was never actually wired into
  `finalize-round` — **now wired up**, see session log 2026-07-28).
- **`leaderboard_entries`** — added 2026-07-28 (was **missing** — never
  created despite `finalize-round` needing it). One best row per player per
  category, `unique(owner_id, category)`. RLS ports Base44's `LeaderboardEntry`:
  public read / service-role-only write. Migration
  `20260728232352_create_leaderboard_entries.sql`.

> **Grant bug found + fixed 2026-07-28.** The "cosmetic-only UPDATE" tightening
> above had over-revoked: a broad `REVOKE ALL` stripped **`service_role`** of
> `SELECT/INSERT/UPDATE/DELETE` on all three original tables, leaving only
> `REFERENCES/TRIGGER/TRUNCATE`. That broke *every* service_role Edge Function
> (`ensure-player` failed with `permission denied for table players`). Fixed by
> migration `20260728222857_grant_service_role_dml_and_authenticated_select.sql`
> — restores `service_role` DML and grants `authenticated` SELECT (RLS still
> scopes rows to the owner) on `players`/`player_stats`/`earnings_log`. The
> earlier "verified" claim only checked `authenticated` column privileges, not
> `service_role` — verify service_role DML on any *new* table going forward.

## Next up — Edge Functions

Working via **Claude Code**, not chat-only, from here — the same assistant
with terminal access to run the Supabase CLI directly against this repo.

Build order:
1. ✅ **`ensure-player`** (done 2026-07-28) — atomic create-if-not-exists on
   first login, running as `service_role`. Replaces the old racy client-side
   `list → create if empty` pattern. The `unique(user_id)` constraint is
   the backstop if two requests race.
2. ✅ **`finalize-round`** and **`manage-business`** (done 2026-07-28) — ported
   from the Base44 source. Reward MATH is verbatim; persistence re-plumbed
   across the split schema. Score-ceiling clamp, session-id replay guard, and
   idle cost/idle-cap logic all carried forward. Economy writes run in
   row-locking `SECURITY DEFINER` RPCs (`finalize_round_apply`,
   `business_buy_apply`, `business_collect_apply`) so concurrent calls can't
   double-grant/double-spend.
3. **IN PROGRESS (batch 2, 2026-07-29)** — rewrite the four raw-client-write
   functions as real Edge Functions, same shape as `finalize-round`. Server-side
   cost/reward tables live in `_shared/catalog.ts` (mirrors `catalog.js`; grows
   per function).
   - ✅ **`buy-upgrade`** (done) — cost `floor(baseCost·growth^level)` under lock
     (`upgrade_buy_apply`), maxLevel + affordability enforced. No achievement
     logic (buyUpgrade moves no achievement stat).
   - ✅ **`claim-daily`** (done) — ports the GAME-HOOK claimDaily
     (`src/lib/game/usePlayer.js`) against the Player model, **not** the dead
     `claim-daily-reward`/`PlayerProfile` path (consistent with audit issue #1).
     UTC calendar day via `(now() at time zone 'utc')::date`, gap-reset streak,
     catalog.js `DAILY_REWARDS`, level-up on xp rewards. **First use of the
     shared achievement evaluator** (`ACHIEVEMENTS` + `evaluateAchievements` in
     `_shared/catalog.ts`) via the reusable idempotent `achievements_apply` RPC.
   - ⏳ **`openSaucePack`** — next. Reuse the achievement evaluator
     (`sauce_collector`).
   - ✅ **`apple-iap-verify`** (done, backend) — real Apple-verified IAP grant.
     Verifies the signed JWS (`app-store-server-api@1.0.0`, cert chain +
     signature) + bundle id; grants exactly-once via `apple_iap_grant_apply`
     (idempotency insert + currency grant in ONE transaction, keyed on the Apple
     transactionId). `appAccountToken` verify-if-present. Web-preview grantIAP
     simulator deleted. E2E sandbox purchase still pending (see follow-ups).
   - ⏳ **`finalize-round` achievement/mission retrofit** — LAST in this batch,
     as its **own** function (own plan/deploy/test/commit, not deferred to a
     later session). `usePlayer.js` still does a follow-up raw `Player.update`
     after finalize-round to apply mission/achievement grants
     (`bumpMissions` / `evaluateAchievements`). Move that server-side into
     `finalize-round` (reuse `achievements_apply`; missions still need a
     server-side `bumpMissions` equivalent), then delete the client raw-write.
   - **Achievement folding sequencing (decided 2026-07-29):** build the shared
     evaluator in claimDaily (done) → reuse in openSaucePack → retrofit
     finalize-round last. Not deferred to a follow-up session.

**Tracked follow-ups (not solved yet):**
- **Daily counter reset needs its own home, likely inside `finalize-round`.**
  The client `claimDaily` also reset today's/mission counters (`servedToday`,
  `dailyMissions`, etc.) on day-change; that was deliberately kept OUT of the
  `claim-daily` port (reset is triggered by the first action of any day, not by
  claiming). Same treatment as the finalize-round achievement retrofit — its own
  work, not solved tonight.
- **`appAccountToken` binding — TWO-PART, both sides required (not a backend
  TODO).** It is currently wired NOWHERE (confirmed in the real source: the
  native `purchase()` doesn't set it, and the backend didn't check it). The
  Supabase `apple-iap-verify` now verifies it *if present* but does not require
  it. To actually bind purchases to a player (needed for App Store Server
  Notifications V2 / refunds, which arrive with no user JWT):
  (1) **native side** — the wrapper's `NativeIAP.purchase()` must set
  `appAccountToken` = the player's auth user id at purchase time (needs a native
  build); and only after that, (2) **backend side** — flip `apple-iap-verify`
  from verify-if-present to **require-and-match**. Part 2 is worthless without
  part 1; don't ship the backend requirement until the native build sets it.
- **IAP end-to-end is UNTESTABLE without the native app + Apple sandbox.** Tests
  done here cover JWS-signature rejection, forged-JWT rejection, and the
  exactly-once grant (via direct RPC). The true path — a real Apple-signed JWS →
  verify → grant — can only be exercised by a **sandbox StoreKit purchase in
  TestFlight through the WKWebView wrapper**. Manual step for the testing phase;
  also confirm `APPLE_BUNDLE_ID` matches the shipped app (the check defaults to
  the Base44-generated bundle id and will reject every real purchase if wrong).
4. ✅ **Hourly earnings cap** wired into `finalize-round` (done 2026-07-28) —
   enforced inside `finalize_round_apply` against the `earnings_log` table
   (cap scope = clamped gameplay coins only; NOT applied to idle-business
   collection, per the Base44 source comment).

## Session log — 2026-07-28 (Edge Functions batch 1)

Shipped and verified end-to-end (deployed → tested with real **and**
forged/invalid calls → committed → pushed one function at a time):

- `ensure-player` — idempotent (2nd call `created:false`, same row, no dup),
  forged JWT → 401. Commit `614af6e`.
- `finalize-round` — ceiling clamp bites (5,000,000 forged coins → 2284
  ceiling), replay guard (`duplicate:true`, no re-grant), hourly cap bites
  (`earnings_log` sums to exactly the 3500 cap), forged JWT → 401. Commit
  `260f164`.
- `manage-business` — cost curve 300→450, locked/unknown/unaffordable rejected,
  collect capped at `MAX_IDLE_MINUTES`, double-collect → 0, forged JWT → 401.
  Commit `97ff562`.

Plus the grant-bug fix and `leaderboard_entries` creation (see Schema section).

**Environment now set up on this machine** (`~/Desktop/Doubles Man`):
- Supabase CLI + `gh` + Deno installed (via Homebrew). Note: the user's
  interactive shell can't find `/opt/homebrew/bin` (a typo — `explort` instead
  of `export` — on line 1 of `~/.zshrc` breaks PATH); use full paths in their
  terminal, or fix that line.
- Repo `git init`'d against `github.com/shaanjahan/The-Doubles-Man` (the repo
  MIGRATION.md referenced — the earlier 404 was just timing; it was created
  2026-07-28). `.gitignore` blocks `.env`/`*.key`/`supabase/.env`.
- Supabase CLI logged in + `link`ed to `zongwrqawgaipabdgmwe`.

**Housekeeping / caveats for next session:**
- **Migrations were applied via the Management API**, not `supabase db push`,
  so they are **not recorded in `supabase_migrations.schema_migrations`**. All
  four are idempotent (`create ... if not exists` / `create or replace` /
  `drop policy if exists`), so a later `db push` or the GitHub integration
  re-applying them is harmless. To record them as applied cleanly, run
  `supabase migration repair --status applied <version>` — needs the DB
  password (skipped at link time).
- The service_role key is NOT set as a function secret (it's auto-injected;
  the name is reserved). Nothing to do.
- **Throwaway test users left in Auth**: `ensure-player-test+…`, `fr-test+…`,
  `mb-test+…` `@example.com`. Delete from the Auth dashboard when convenient.
- Client/server tier-threshold mismatch (pre-existing): server
  `LVL_REQS=[1,5,9,14,19,25,32]` vs client `usePlayer.js`
  `lvlReqs=[1,3,6,10,15,22,30]`. Server is authoritative; reconcile the client
  so the UI doesn't mispredict tier-ups.

## Cutover readiness — BLOCKED (as of 2026-07-29)

The frontend cutover (pointing `base44Client.js` at Supabase) is **blocked on
all** of the following, not just grantIAP. Do not schedule the swap until every
line here is cleared:

1. **`grantIAP` / `apple-iap-verify` — BACKEND DONE, E2E PENDING.** The real
   Apple-verified IAP grant is written, deployed, and tested for JWS-rejection,
   forged-JWT, and exactly-once grant (idempotent, no double-grant on replay).
   STILL REQUIRED before relying on it: a sandbox TestFlight purchase E2E, and
   confirming `APPLE_BUNDLE_ID` matches the shipped app (see follow-ups).
2. **`finalize-round` achievement/mission retrofit — NOT STARTED.** The client
   still does a raw `Player.update` after finalize-round for mission/achievement
   grants; must move server-side (its own plan/deploy/test/commit) before the
   swap, or the swap re-exposes that raw write.
3. **`base44Client.js` swap code — NOT WRITTEN.** The actual adapter pointing
   the single SDK entrypoint at Supabase (auth + `functions.invoke` +
   remaining reads) does not exist yet. The migration's whole "flip one config"
   premise depends on this and it hasn't been built.
4. **Netlify deployment — NOT CONFIRMED LIVE.** DNS steps are documented, but
   the site has not been confirmed actually serving at `thedoublesman.com`.
5. **Native wrapper WKWebView URL — UNRESOLVED.** Still unconfirmed whether the
   shipped iOS wrapper's WKWebView loads `thedoublesman.com` or a Base44 domain.
   If it's still Base44, one more native build (its own review clock) is needed
   to repoint it before backend changes are visible to the app. This has been
   open since the start of the project.

Only ensure-player / finalize-round / manage-business / buy-upgrade /
claim-daily / open-sauce-pack are done. Backend-complete ≠ cutover-ready.

## StoreKit — rules that must survive the port

- Native IAP goes through `window.NativeIAP` (injected by the wrapper) →
  `apple-iap-verify` → verifies the signed JWS server-side → grants →
  **only then** `window.NativeIAP.finish(transactionId)`. Never finish
  before the grant is durably written — consumables have no restore path,
  so finishing early on a failed write loses the transaction and the
  player's money for nothing.
- Verify: is `appAccountToken` set at purchase time to bind the StoreKit
  transaction to the player record?
- Not yet built: an **App Store Server Notifications V2** endpoint for
  refunds/consumption requests — right now only client-triggered
  verification exists, so a refund currently wouldn't be caught.

## Budget

~$65–100 total to get through Aug 15: Base44 Builder plan kept alive
(~$40/mo, as rollback insurance), Supabase (free → ~$25/mo from ~Aug 7),
everything else (Netlify, GitHub, Sentry) on free tiers at this scale.

## Target

Testers on the new backend by **August 15, 2026**. Buffer built into the
back half of the timeline deliberately — protect it rather than filling it.
