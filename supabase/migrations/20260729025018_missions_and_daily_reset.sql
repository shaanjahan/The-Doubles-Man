-- Mission system + daily reset.
--
-- Decisions (2026-07-29), confirmed against the real client source:
--   1. FAITHFUL: only daily missions rotate. Weekly/monthly are seeded once and
--      never rotate; their week/month stat counters never reset.
--   2. FIXED: the daily reset (zero the today-counters + re-seed daily missions)
--      now triggers on the FIRST ACTION of a new UTC day inside
--      finalize_round_apply -- not coupled to claim-daily as the buggy client was.
--   3. FAITHFUL: deterministic first-N mission selection (handled in TS).
--
-- Mission pools / defaults live in _shared/catalog.ts; the fresh mission sets
-- are passed in as parameters, so this SQL holds no mission catalog.

-- Replace finalize_round_apply with a version that also does daily reset +
-- lazy mission init under the same lock. Drop the old signature first (adding
-- params makes it a different overload otherwise).
drop function if exists public.finalize_round_apply(
  uuid,text,integer,integer,integer,integer,integer,integer,integer,integer,
  jsonb,jsonb,integer,integer,integer,integer,boolean);

create or replace function public.finalize_round_apply(
  p_user_id            uuid,
  p_session_id         text,
  p_coins_earned       integer,
  p_biz_bonus          integer,
  p_gems_earned        integer,
  p_level_up_coins     integer,
  p_level_up_gems      integer,
  p_new_xp             integer,
  p_new_level          integer,
  p_new_tier           integer,
  p_new_magic_sauces   jsonb,
  p_new_equipped_sauces jsonb,
  p_served             integer,
  p_perfect            integer,
  p_mistakes           integer,
  p_max_combo          integer,
  p_sauce_used         boolean,
  p_default_daily      jsonb,   -- fresh daily set (for reset + lazy init)
  p_default_weekly     jsonb,   -- for lazy init only (no rotation)
  p_default_monthly    jsonb    -- for lazy init only (no rotation)
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player       public.players%rowtype;
  v_cap          integer;
  v_used         integer;
  v_remaining    integer;
  v_allowed      integer;
  v_coins_granted integer;
  v_stats        public.player_stats%rowtype;
  v_today        date;
  v_day_changed  boolean;
  v_daily        jsonb;
  v_weekly       jsonb;
  v_monthly      jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  -- Replay guard under lock (unchanged).
  if p_session_id is not null and p_session_id <> ''
     and coalesce(v_player.last_round_session_id, '') = p_session_id then
    select * into v_stats from public.player_stats where player_id = v_player.id;
    return jsonb_build_object(
      'duplicate', true, 'limited', false, 'allowed', 0, 'coins_granted', 0,
      'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
  end if;

  -- Day-change detection (UTC), read from player_stats.last_day_reset.
  v_today := (now() at time zone 'utc')::date;
  select (last_day_reset is null or last_day_reset < v_today) into v_day_changed
    from public.player_stats where player_id = v_player.id;
  v_day_changed := coalesce(v_day_changed, true);

  -- Mission lists: lazy-init empty lists, and reset DAILY on day-change.
  v_daily   := coalesce(v_player.daily_missions, '[]'::jsonb);
  v_weekly  := coalesce(v_player.weekly_missions, '[]'::jsonb);
  v_monthly := coalesce(v_player.monthly_missions, '[]'::jsonb);
  if jsonb_array_length(v_daily) = 0 or v_day_changed then v_daily := p_default_daily; end if;
  if jsonb_array_length(v_weekly) = 0 then v_weekly := p_default_weekly; end if;
  if jsonb_array_length(v_monthly) = 0 then v_monthly := p_default_monthly; end if;

  -- Hourly cap (unchanged).
  v_cap := coalesce(nullif(v_player.hourly_earnings_cap, 0), 3500);
  select coalesce(sum(coins), 0) into v_used
    from public.earnings_log
    where player_id = v_player.id and logged_at >= now() - interval '1 hour';
  v_remaining := greatest(0, v_cap - v_used);
  v_allowed   := greatest(0, least(greatest(p_coins_earned, 0), v_remaining));
  if v_allowed > 0 then
    insert into public.earnings_log (player_id, coins) values (v_player.id, v_allowed);
  end if;
  v_coins_granted := v_allowed + greatest(p_biz_bonus, 0);

  -- Players: economy (unchanged) + mission lists (init/reset applied above).
  update public.players set
    coins  = coins + v_coins_granted + greatest(p_level_up_coins, 0),
    gems   = gems  + greatest(p_gems_earned, 0) + greatest(p_level_up_gems, 0),
    xp     = greatest(p_new_xp, 0),
    level  = greatest(p_new_level, 1),
    business_tier   = greatest(p_new_tier, 0),
    magic_sauces    = coalesce(p_new_magic_sauces, magic_sauces),
    equipped_sauces = coalesce(p_new_equipped_sauces, equipped_sauces),
    daily_missions   = v_daily,
    weekly_missions  = v_weekly,
    monthly_missions = v_monthly,
    last_round_session_id = case
      when p_session_id is null or p_session_id = '' then last_round_session_id
      else p_session_id end
  where id = v_player.id
  returning * into v_player;

  -- player_stats: lifetime + week/month counters always accumulate; the six
  -- TODAY counters ZERO first on a day-change (this round starts the new day),
  -- and last_day_reset advances. Week/month never reset (faithful).
  update public.player_stats set
    customers_served = customers_served + greatest(p_served, 0),
    perfect_orders   = perfect_orders   + greatest(p_perfect, 0),
    mistakes         = mistakes         + greatest(p_mistakes, 0),
    rounds_played    = rounds_played    + 1,
    lifetime_coins   = lifetime_coins   + v_coins_granted,
    highest_combo    = greatest(highest_combo, greatest(p_max_combo, 0)),
    served_today     = (case when v_day_changed then 0 else served_today end) + greatest(p_served, 0),
    perfect_today    = (case when v_day_changed then 0 else perfect_today end) + greatest(p_perfect, 0),
    max_combo_today  = greatest(case when v_day_changed then 0 else max_combo_today end, greatest(p_max_combo, 0)),
    coins_today      = (case when v_day_changed then 0 else coins_today end) + v_coins_granted,
    rounds_today     = (case when v_day_changed then 0 else rounds_today end) + 1,
    sauce_used_today = (case when v_day_changed then 0 else sauce_used_today end) + case when p_sauce_used then 1 else 0 end,
    served_week      = served_week      + greatest(p_served, 0),
    served_month     = served_month     + greatest(p_served, 0),
    last_day_reset   = case when v_day_changed then v_today else last_day_reset end
  where player_id = v_player.id
  returning * into v_stats;

  return jsonb_build_object(
    'duplicate', false,
    'limited', v_allowed < greatest(p_coins_earned, 0),
    'allowed', v_allowed,
    'coins_granted', v_coins_granted,
    'day_reset', v_day_changed,
    'player', to_jsonb(v_player),
    'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.finalize_round_apply(
  uuid,text,integer,integer,integer,integer,integer,integer,integer,integer,
  jsonb,jsonb,integer,integer,integer,integer,boolean,jsonb,jsonb,jsonb) from public;
grant execute on function public.finalize_round_apply(
  uuid,text,integer,integer,integer,integer,integer,integer,integer,integer,
  jsonb,jsonb,integer,integer,integer,integer,boolean,jsonb,jsonb,jsonb) to service_role;


-- ---- missions_apply (reusable, idempotent) ----
-- The edge function bumps missions in TS (evaluateMissions) against the
-- authoritative post-round state, then calls this to persist the lists and grant
-- rewards. Grants only for missions that are claimed in the incoming lists but
-- NOT already claimed in the DB (re-checked under lock), so re-bumps / retries
-- can't double-grant. Reward amounts come from the mission objects themselves.
create or replace function public.missions_apply(
  p_user_id uuid,
  p_daily   jsonb,
  p_weekly  jsonb,
  p_monthly jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_coins  integer := 0;
  v_gems   integer := 0;
  v_xp     integer := 0;
  m        jsonb;
  v_claimed_now boolean;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  -- For each incoming mission marked claimed, grant its reward only if the
  -- matching DB mission (same id, same list) is not already claimed.
  for m in
    select * from jsonb_array_elements(coalesce(p_daily, '[]'::jsonb))
    union all select * from jsonb_array_elements(coalesce(p_weekly, '[]'::jsonb))
    union all select * from jsonb_array_elements(coalesce(p_monthly, '[]'::jsonb))
  loop
    if coalesce((m ->> 'claimed')::boolean, false) then
      select exists (
        select 1 from (
          select * from jsonb_array_elements(coalesce(v_player.daily_missions, '[]'::jsonb))
          union all select * from jsonb_array_elements(coalesce(v_player.weekly_missions, '[]'::jsonb))
          union all select * from jsonb_array_elements(coalesce(v_player.monthly_missions, '[]'::jsonb))
        ) db(e)
        where db.e ->> 'id' = m ->> 'id' and coalesce((db.e ->> 'claimed')::boolean, false)
      ) into v_claimed_now;
      if not v_claimed_now then
        v_coins := v_coins + coalesce(((m -> 'reward') ->> 'coins')::integer, 0);
        v_gems  := v_gems  + coalesce(((m -> 'reward') ->> 'gems')::integer, 0);
        v_xp    := v_xp    + coalesce(((m -> 'reward') ->> 'xp')::integer, 0);
      end if;
    end if;
  end loop;

  update public.players set
    coins = coins + v_coins,
    gems  = gems  + v_gems,
    xp    = xp    + v_xp,   -- faithful: mission xp added WITHOUT level-up recompute
    daily_missions   = coalesce(p_daily, daily_missions),
    weekly_missions  = coalesce(p_weekly, weekly_missions),
    monthly_missions = coalesce(p_monthly, monthly_missions)
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'granted_coins', v_coins, 'granted_gems', v_gems, 'granted_xp', v_xp,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.missions_apply(uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.missions_apply(uuid,jsonb,jsonb,jsonb) to service_role;
