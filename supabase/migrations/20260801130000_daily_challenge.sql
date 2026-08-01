-- Daily Challenge ("Today's Rush"): one seeded, identical round per UTC day,
-- scored onto its own daily board (category 'daily_challenge').
--
-- *** PARKED ON feature/fleet-idle-cap — apply at the post-review feature drop,
-- *** together with 20260801120000_leaderboard_periods.sql (this depends on its
-- *** period/period_key columns). Ship order is documented in that file.
--
-- players.last_challenge_day is the one-attempt gate. finalize-round claims it
-- atomically (conditional UPDATE) before posting the score; a replayed or
-- second attempt still grants normal round rewards but never re-posts to the
-- challenge board. Adding a nullable column touches NO existing data.

alter table public.players
  add column if not exists last_challenge_day date;

-- Best-of-day writer for the challenge board. Same greatest()/identity-refresh
-- semantics as leaderboard_upsert_best, one category, daily period only.
create or replace function public.challenge_upsert_best(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_score         integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard_entries
    (owner_id, category, period, period_key, score,
     display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'daily_challenge', 'daily',
     to_char(now() at time zone 'utc', 'YYYY-MM-DD'), p_score,
     p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category, period, period_key) do update
    set score = greatest(excluded.score, public.leaderboard_entries.score),
        display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji,
        location_id = excluded.location_id,
        business_tier = excluded.business_tier,
        level = excluded.level,
        vip = excluded.vip,
        updated_at = now();
end;
$$;

revoke all on function public.challenge_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer) from public;
grant execute on function public.challenge_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer) to service_role;
