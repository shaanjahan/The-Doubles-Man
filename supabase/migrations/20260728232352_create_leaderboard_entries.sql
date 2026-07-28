-- leaderboard_entries: one best row per player per category.
--
-- Ports Base44's LeaderboardEntry entity + its RLS:
--   read: null            -> public read (anyone)
--   create/update/delete: admin -> server-only (service_role bypasses RLS;
--                                   no policy exists for anon/authenticated)
--
-- unique(owner_id, category) lets finalize-round replace Base44's
-- read-all-then-find-max dance with a race-safe conditional upsert.

create table if not exists public.leaderboard_entries (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  category      text not null,
  score         integer not null default 0,
  display_name  text not null,
  avatar_emoji  text,
  location_id   integer,
  business_tier integer,
  level         integer,
  vip           boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (owner_id, category)
);

create index if not exists leaderboard_entries_category_score_idx
  on public.leaderboard_entries (category, score desc);

alter table public.leaderboard_entries enable row level security;

-- Public read (Base44 read: null). Recreate idempotently.
drop policy if exists "leaderboard public read" on public.leaderboard_entries;
create policy "leaderboard public read"
  on public.leaderboard_entries for select using (true);

-- No insert/update/delete policy => only service_role (RLS-bypassing) writes.
grant select on public.leaderboard_entries to anon, authenticated;
grant select, insert, update, delete on public.leaderboard_entries to service_role;

-- Best-effort "write my best per category" helper. Called by finalize-round
-- AFTER the economy transaction commits, so a leaderboard hiccup can never
-- roll back a player's earned rewards (Base44 treated leaderboard writes as
-- non-fatal too). Each category row is only overwritten when the new score is
-- strictly higher, via ON CONFLICT ... WHERE excluded.score > current.
create or replace function public.leaderboard_upsert_best(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_round_score   integer,
  p_customers     integer,
  p_max_combo     integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Three categories, three explicit conditional upserts.
  insert into public.leaderboard_entries
    (owner_id, category, score, display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'round_score', p_round_score, p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category) do update
    set score = excluded.score, display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji, location_id = excluded.location_id,
        business_tier = excluded.business_tier, level = excluded.level,
        vip = excluded.vip, updated_at = now()
    where excluded.score > public.leaderboard_entries.score;

  insert into public.leaderboard_entries
    (owner_id, category, score, display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'customers_served', p_customers, p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category) do update
    set score = excluded.score, display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji, location_id = excluded.location_id,
        business_tier = excluded.business_tier, level = excluded.level,
        vip = excluded.vip, updated_at = now()
    where excluded.score > public.leaderboard_entries.score;

  insert into public.leaderboard_entries
    (owner_id, category, score, display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'max_combo', p_max_combo, p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category) do update
    set score = excluded.score, display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji, location_id = excluded.location_id,
        business_tier = excluded.business_tier, level = excluded.level,
        vip = excluded.vip, updated_at = now()
    where excluded.score > public.leaderboard_entries.score;
end;
$$;

revoke all on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer) from public;
grant execute on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer) to service_role;
