-- Remove the hourly wallet cap (owner decision, 2026-08-01): full
-- original-way economics — rounds pay complete earnings. Anti-cheat
-- plausibility clamps and earnings_log recording remain. Exact deployed
-- function body with only the cap-resolution block replaced.
CREATE OR REPLACE FUNCTION public.finalize_round_apply(p_user_id uuid, p_session_id text, p_coins_earned integer, p_biz_bonus integer, p_gems_earned integer, p_level_up_coins integer, p_level_up_gems integer, p_new_xp integer, p_new_level integer, p_new_tier integer, p_new_magic_sauces jsonb, p_new_equipped_sauces jsonb, p_served integer, p_perfect integer, p_mistakes integer, p_max_combo integer, p_sauce_used boolean, p_default_daily jsonb, p_default_weekly jsonb, p_default_monthly jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_cap := 2147483647;
  -- Hourly wallet cap REMOVED (2026-08-01, owner decision): rounds pay their
  -- full earnings — original Base44 economics. The per-round anti-cheat
  -- plausibility ceiling (computed in the finalize-round edge function) still
  -- clamps forged values; earnings_log keeps recording for analytics.
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
$function$

