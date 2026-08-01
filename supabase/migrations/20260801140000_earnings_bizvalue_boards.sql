-- Two new period-board categories:
--   'total_earnings' — CUMULATIVE dollars earned within each period (rounds +
--     idle collections). Daily/weekly/monthly rows accumulate deltas; the
--     all-time row converges to the authoritative lifetime_coins stat.
--   'biz_value'      — SNAPSHOT of the vendor's business-empire value (total
--     invested purchase cost of the owned fleet). Posted greatest-wins per
--     period whenever it changes (buys) or the player is active (round end),
--     so each period board reads "biggest empire seen this period".
--
-- *** PARKED ON feature/fleet-idle-cap — apply at the post-review drop AFTER
-- *** 20260801120000_leaderboard_periods.sql (needs period/period_key).

-- Cumulative earnings boards.
create or replace function public.earnings_board_add(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_delta         bigint,   -- dollars earned by this event (round or collect)
  p_lifetime      bigint    -- current lifetime_coins (authoritative for alltime)
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periods text[] := array['daily','weekly','monthly'];
  v_keys    text[];
  v_delta   bigint := greatest(coalesce(p_delta, 0), 0);
  i int;
begin
  v_keys := array[
    to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
    to_char(now() at time zone 'utc', 'IYYY-"W"IW'),
    to_char(now() at time zone 'utc', 'YYYY-MM')
  ];

  for i in 1..3 loop
    insert into public.leaderboard_entries
      (owner_id, category, period, period_key, score,
       display_name, avatar_emoji, location_id, business_tier, level, vip)
    values
      (p_owner_id, 'total_earnings', v_periods[i], v_keys[i], v_delta,
       p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
    on conflict (owner_id, category, period, period_key) do update
      set score = public.leaderboard_entries.score + v_delta,
          display_name = excluded.display_name,
          avatar_emoji = excluded.avatar_emoji,
          location_id = excluded.location_id,
          business_tier = excluded.business_tier,
          level = excluded.level,
          vip = excluded.vip,
          updated_at = now();
  end loop;

  -- All-time converges to lifetime_coins (monotonic, authoritative) so
  -- pre-boards history is represented from the very first write.
  insert into public.leaderboard_entries
    (owner_id, category, period, period_key, score,
     display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'total_earnings', 'alltime', '', greatest(coalesce(p_lifetime, 0), v_delta),
     p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category, period, period_key) do update
    set score = greatest(public.leaderboard_entries.score + v_delta, coalesce(p_lifetime, 0)),
        display_name = excluded.display_name,
        avatar_emoji = excluded.avatar_emoji,
        location_id = excluded.location_id,
        business_tier = excluded.business_tier,
        level = excluded.level,
        vip = excluded.vip,
        updated_at = now();
end;
$$;

revoke all on function public.earnings_board_add(uuid,text,text,integer,integer,integer,boolean,bigint,bigint) from public;
grant execute on function public.earnings_board_add(uuid,text,text,integer,integer,integer,boolean,bigint,bigint) to service_role;

-- Empire-value snapshot boards (greatest-wins across all four periods).
create or replace function public.bizvalue_board_set(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_value         bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_periods text[] := array['alltime','daily','weekly','monthly'];
  v_keys    text[];
  v_value   bigint := greatest(coalesce(p_value, 0), 0);
  i int;
begin
  v_keys := array[
    '',
    to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
    to_char(now() at time zone 'utc', 'IYYY-"W"IW'),
    to_char(now() at time zone 'utc', 'YYYY-MM')
  ];

  for i in 1..4 loop
    insert into public.leaderboard_entries
      (owner_id, category, period, period_key, score,
       display_name, avatar_emoji, location_id, business_tier, level, vip)
    values
      (p_owner_id, 'biz_value', v_periods[i], v_keys[i], v_value,
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
  end loop;
end;
$$;

revoke all on function public.bizvalue_board_set(uuid,text,text,integer,integer,integer,boolean,bigint) from public;
grant execute on function public.bizvalue_board_set(uuid,text,text,integer,integer,integer,boolean,bigint) to service_role;
