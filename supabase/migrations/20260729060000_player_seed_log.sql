-- Tracks which testers have had their Base44 data seeded, so the seed script's
-- idempotency is based on "have I seeded this account?" — not the player's
-- current state. The old "seed only if at creation defaults" guard was wrong:
-- testers sign in and immediately play, so they're never at defaults when the
-- seed runs, which meant they'd be skipped (never seeded) unless forced (which
-- then clobbers). This log is correct regardless of when they play: seed once,
-- log it, never touch again.

create table if not exists public.player_seed_log (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text,
  seeded_at timestamptz not null default now(),
  note      text
);

alter table public.player_seed_log enable row level security;
-- migration-ops data: no policies -> service_role only.
grant select, insert, update, delete on public.player_seed_log to service_role;

-- Backfill the account already seeded during pre-cutover testing (before this
-- log existed), so it reads as already-seeded, not re-seedable.
insert into public.player_seed_log (user_id, email, note)
select id, email, 'backfill: seeded during pre-cutover testing'
from auth.users
where lower(email) = 'ptsudarshan@icloud.com'
on conflict (user_id) do nothing;
