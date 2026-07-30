-- leaderboard_seed: each migrated tester's historical best-per-category scores
-- from the Base44 Leaderboard export, keyed by email, so their standings can be
-- applied AUTOMATICALLY the first time they sign into the new app.
--
-- ensure-player reads this on player-ensure and calls leaderboard_upsert_best
-- (only-if-greater), then stamps seeded_at so it applies exactly once per tester.
-- Populated out-of-band by scripts/seed-leaderboard.ts — tester emails are PII
-- and never live in the repo, only in this locked-down table.

create table if not exists public.leaderboard_seed (
  email            text primary key,
  display_name     text not null default 'New Vendor',
  avatar_emoji     text,
  location_id      integer not null default 0,
  business_tier    integer not null default 0,
  level            integer not null default 1,
  vip              boolean not null default false,
  round_score      integer not null default 0,
  customers_served integer not null default 0,
  max_combo        integer not null default 0,
  seeded_at        timestamptz,             -- set once applied to a signed-in user
  created_at       timestamptz not null default now()
);

alter table public.leaderboard_seed enable row level security;

-- No policies => only service_role (RLS-bypassing) reads/writes. This table
-- holds tester emails; keep it fully backend-only. anon/authenticated get nothing.
revoke all on public.leaderboard_seed from anon, authenticated;
grant select, insert, update, delete on public.leaderboard_seed to service_role;
