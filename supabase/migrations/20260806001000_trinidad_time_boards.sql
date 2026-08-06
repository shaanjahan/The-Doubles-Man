-- Board days run on Trinidad time (America/Port_of_Spain, fixed UTC-4).
--
-- The first live daily rollover (2026-08-06 00:00 UTC) hit at 8 PM Trinidad —
-- prime evening play — and "disappeared" the day's race mid-session. Owner
-- decision: the daily/weekly/monthly board keys flip at MIDNIGHT LOCAL
-- instead. Applied while the Trinidad date was still 2026-08-05, so the
-- evening's rows became the current daily board again automatically (no data
-- moved; the same period_key simply became current again).
--
-- Client mirror: periodKeyFor / todayTrini shift now() by -4h (no DST in
-- POS). The finalize-round challenge gate uses the same shifted day.
-- Mission/stat *_today resets remain UTC for now (server RPC untouched) —
-- invisible next to the boards; can follow later if wanted.

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
  p_max_combo     integer,
  p_all_periods   boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cats    text[] := array['round_score','customers_served','max_combo'];
  v_scores  integer[];
  v_periods text[];
  v_keys    text[];
  i int; j int;
begin
  v_scores := array[p_round_score, p_customers, p_max_combo];
  if p_all_periods then
    v_periods := array['alltime','daily','weekly','monthly'];
    v_keys := array[
      '',
      to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM-DD'),
      to_char(now() at time zone 'America/Port_of_Spain', 'IYYY-"W"IW'),
      to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM')
    ];
  else
    v_periods := array['alltime'];
    v_keys    := array[''];
  end if;

  for i in 1..array_length(v_cats, 1) loop
    for j in 1..array_length(v_periods, 1) loop
      insert into public.leaderboard_entries
        (owner_id, category, period, period_key, score,
         display_name, avatar_emoji, location_id, business_tier, level, vip)
      values
        (p_owner_id, v_cats[i], v_periods[j], v_keys[j], v_scores[i],
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
  end loop;
end;
$$;

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
     to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM-DD'), p_score,
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

create or replace function public.earnings_board_add(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_delta         bigint,
  p_lifetime      bigint
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
    to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM-DD'),
    to_char(now() at time zone 'America/Port_of_Spain', 'IYYY-"W"IW'),
    to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM')
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
    to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM-DD'),
    to_char(now() at time zone 'America/Port_of_Spain', 'IYYY-"W"IW'),
    to_char(now() at time zone 'America/Port_of_Spain', 'YYYY-MM')
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
