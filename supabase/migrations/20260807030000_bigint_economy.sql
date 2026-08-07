-- Billion-scale economy: widen every coin path from int4 to bigint.
--
-- Trigger: owner-approved coin-pack retune tops out at a $99.99 /
-- 1,000,000,000-coin pack. players.coins was int4 (max ~2.147B) — one big pack
-- on a whale wallet overflows it. The sweep also fixes latent int4 bugs that
-- would have hit organically:
--   * business_buy_apply cost var: Doubles Monarch #19 costs ~2.7B (overflow
--     at floor()::integer even before any pack).
--   * finalize_round_apply hourly sum + wallet-sized vars.
--   * leaderboard scores / earnings logs crossing 2.1B lifetime.
--
-- Wallet math is column-side everywhere (coins = coins + X), so widening the
-- columns fixes storage; the function changes below widen the vars/params that
-- HOLD wallet- or cost-sized values. Functions whose signature changes are
-- dropped and recreated (with re-grants); same-signature bodies keep their ACLs
-- through CREATE OR REPLACE.

-- ---- columns ----
alter table public.players            alter column coins              type bigint;
alter table public.players            alter column hourly_earnings_cap type bigint;
alter table public.leaderboard_entries alter column score             type bigint;
alter table public.earnings_log       alter column coins              type bigint;
alter table public.player_stats       alter column coins_today        type bigint;
alter table public.leaderboard_seed   alter column round_score        type bigint;

-- ---- same-signature replacements (vars widened) ----

create or replace function public.achievements_apply(
  p_user_id uuid, p_grants jsonb, p_progress jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_coins  bigint := 0;
  v_gems   integer := 0;
  g        jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  for g in select * from jsonb_array_elements(coalesce(p_grants, '[]'::jsonb)) loop
    if coalesce((v_player.achievement_progress -> (g ->> 'id') ->> 'claimed')::boolean, false) = false then
      v_coins := v_coins + coalesce((g ->> 'coins')::bigint, 0);
      v_gems  := v_gems  + coalesce((g ->> 'gems')::integer, 0);
    end if;
  end loop;

  update public.players set
    coins = coins + v_coins,
    gems = gems + v_gems,
    achievement_progress = coalesce(achievement_progress, '{}'::jsonb) || coalesce(p_progress, '{}'::jsonb)
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'granted_coins', v_coins, 'granted_gems', v_gems,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

create or replace function public.missions_apply(
  p_user_id uuid, p_daily jsonb, p_weekly jsonb, p_monthly jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_coins  bigint := 0;
  v_gems   integer := 0;
  v_xp     integer := 0;
  m        jsonb;
  v_claimed_now boolean;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

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
        v_coins := v_coins + coalesce(((m -> 'reward') ->> 'coins')::bigint, 0);
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

create or replace function public.business_buy_apply(
  p_user_id uuid, p_tier integer, p_unlock_tier integer,
  p_base_cost numeric, p_cost_growth numeric
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_owned  integer;
  v_cost   bigint;
  v_next   jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  if coalesce(v_player.business_tier, 0) < p_unlock_tier then
    return jsonb_build_object('error', 'locked');
  end if;

  select coalesce((
    select (elem->>'count')::integer
    from jsonb_array_elements(v_player.businesses) elem
    where (elem->>'tier')::integer = p_tier
    limit 1), 0)
  into v_owned;

  -- bigint: high copy-counts overflow int4 (Monarch #19 is ~2.7B).
  v_cost := floor(p_base_cost * power(p_cost_growth, v_owned))::bigint;

  if coalesce(v_player.coins, 0) < v_cost then
    return jsonb_build_object('error', 'insufficient', 'cost', v_cost);
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_player.businesses) elem
    where (elem->>'tier')::integer = p_tier
  ) then
    select jsonb_agg(
      case when (elem->>'tier')::integer = p_tier
        then jsonb_build_object('tier', p_tier, 'count', (elem->>'count')::integer + 1)
        else elem end)
    into v_next
    from jsonb_array_elements(v_player.businesses) elem;
  else
    v_next := v_player.businesses || jsonb_build_array(jsonb_build_object('tier', p_tier, 'count', 1));
  end if;

  update public.players set
    coins = coins - v_cost,
    businesses = v_next,
    last_business_collect = coalesce(last_business_collect, now())
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'cost', v_cost, 'bought', p_tier,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

create or replace function public.upgrade_buy_apply(
  p_user_id uuid, p_upgrade_id text, p_base_cost numeric, p_growth numeric, p_max_level integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_cur    integer;
  v_cost   bigint;
  v_next   jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  v_cur := coalesce((v_player.upgrades ->> p_upgrade_id)::integer, 0);

  if v_cur >= p_max_level then
    return jsonb_build_object('error', 'max_level', 'level', v_cur);
  end if;

  v_cost := floor(p_base_cost * power(p_growth, v_cur))::bigint;

  if coalesce(v_player.coins, 0) < v_cost then
    return jsonb_build_object('error', 'insufficient', 'cost', v_cost);
  end if;

  v_next := jsonb_set(coalesce(v_player.upgrades, '{}'::jsonb),
                      array[p_upgrade_id], to_jsonb(v_cur + 1), true);

  update public.players set
    coins = coins - v_cost,
    upgrades = v_next
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'cost', v_cost, 'upgrade', p_upgrade_id, 'level', v_cur + 1,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

-- daily_claim_apply: same 7-arg signature, wallet var widened.
create or replace function public.daily_claim_apply(
  p_user_id uuid,
  p_rewards jsonb,
  p_max_day integer,
  p_loop_start integer default 24,
  p_repair boolean default false,
  p_repair_cost integer default 25,
  p_repair_min integer default 3
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_today  date;
  v_streak integer;
  v_day    integer;
  v_reward jsonb;
  v_repaired boolean := false;
  v_coins  bigint;
  v_gems   integer;
  v_xp     integer;
  v_level  integer;
  v_tier   integer;
  v_need   integer;
  v_sauce  text;
  v_magic  jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  v_today := (now() at time zone 'America/Port_of_Spain')::date;

  if v_player.last_daily_claim >= v_today then
    return jsonb_build_object('error', 'already_claimed');
  end if;

  if v_player.last_daily_claim is null then
    v_streak := 0;
  elsif v_player.last_daily_claim = (v_today - 1) then
    v_streak := coalesce(v_player.daily_streak, 0);
  elsif p_repair then
    if v_player.last_daily_claim <> (v_today - 2)
       or coalesce(v_player.daily_streak, 0) < p_repair_min then
      return jsonb_build_object('error', 'repair_unavailable');
    end if;
    if v_player.gems < p_repair_cost then
      return jsonb_build_object('error', 'not_enough_gems');
    end if;
    v_streak := coalesce(v_player.daily_streak, 0);
    v_repaired := true;
  else
    v_streak := 0;
  end if;
  v_streak := v_streak + 1;

  if v_streak <= p_max_day then
    v_day := v_streak;
  else
    v_day := p_loop_start + ((v_streak - p_loop_start) % (p_max_day - p_loop_start + 1));
  end if;
  v_reward := p_rewards -> (v_day - 1);

  v_coins := v_player.coins + coalesce((v_reward ->> 'coins')::bigint, 0);
  v_gems  := v_player.gems  + coalesce((v_reward ->> 'gems')::integer, 0)
           - (case when v_repaired then p_repair_cost else 0 end);
  v_xp    := v_player.xp    + coalesce((v_reward ->> 'xp')::integer, 0);
  v_level := v_player.level;

  loop
    v_need := floor(80 * power(1.18, v_level - 1))::integer;
    exit when v_xp < v_need;
    v_xp := v_xp - v_need;
    v_level := v_level + 1;
    v_coins := v_coins + (100 + v_level * 25);
    v_gems := v_gems + greatest(1, v_level / 5);
  end loop;

  v_tier := coalesce(v_player.business_tier, 0);
  if    v_level >= 32 then v_tier := greatest(v_tier, 6);
  elsif v_level >= 25 then v_tier := greatest(v_tier, 5);
  elsif v_level >= 19 then v_tier := greatest(v_tier, 4);
  elsif v_level >= 14 then v_tier := greatest(v_tier, 3);
  elsif v_level >= 9  then v_tier := greatest(v_tier, 2);
  elsif v_level >= 5  then v_tier := greatest(v_tier, 1);
  end if;

  v_magic := coalesce(v_player.magic_sauces, '[]'::jsonb);
  v_sauce := v_reward ->> 'magicSauce';
  if v_sauce is not null then
    if exists (select 1 from jsonb_array_elements(v_magic) e where e ->> 'id' = v_sauce) then
      select jsonb_agg(
        case when e ->> 'id' = v_sauce
          then jsonb_set(e, '{count}', to_jsonb(coalesce((e ->> 'count')::integer, 0) + 1))
          else e end)
      into v_magic
      from jsonb_array_elements(v_magic) e;
    else
      v_magic := v_magic || jsonb_build_array(jsonb_build_object('id', v_sauce, 'count', 1));
    end if;
  end if;

  update public.players set
    coins = v_coins, gems = v_gems, xp = v_xp, level = v_level,
    business_tier = v_tier, magic_sauces = v_magic,
    daily_streak = v_streak, last_daily_claim = v_today
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'streak', v_streak, 'day', v_day, 'reward', v_reward, 'repaired', v_repaired,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

-- ---- signature changes (drop + recreate + re-grant) ----

drop function if exists public.apple_iap_grant_apply(uuid, text, text, numeric, integer, integer, jsonb, boolean);
create or replace function public.apple_iap_grant_apply(
  p_user_id uuid, p_checkout_id text, p_product_id text, p_amount numeric,
  p_coins bigint, p_gems integer, p_sauce_ids jsonb, p_vip boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player  public.players%rowtype;
  v_stats   public.player_stats%rowtype;
  v_new_id  uuid;
  v_magic   jsonb;
  v_id      text;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  insert into public.purchases (owner_id, checkout_id, product_id, amount)
  values (p_user_id, p_checkout_id, p_product_id, p_amount)
  on conflict (checkout_id) do nothing
  returning id into v_new_id;

  if v_new_id is null then
    select * into v_stats from public.player_stats where player_id = v_player.id;
    return jsonb_build_object('alreadyGranted', true,
      'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
  end if;

  v_magic := coalesce(v_player.magic_sauces, '[]'::jsonb);
  for v_id in select jsonb_array_elements_text(coalesce(p_sauce_ids, '[]'::jsonb)) loop
    if exists (select 1 from jsonb_array_elements(v_magic) e where e ->> 'id' = v_id) then
      select jsonb_agg(
        case when e ->> 'id' = v_id
          then jsonb_set(e, '{count}', to_jsonb(coalesce((e ->> 'count')::integer, 0) + 1))
          else e end)
      into v_magic
      from jsonb_array_elements(v_magic) e;
    else
      v_magic := v_magic || jsonb_build_array(jsonb_build_object('id', v_id, 'count', 1));
    end if;
  end loop;

  update public.players set
    coins = coins + coalesce(p_coins, 0),
    gems  = gems  + coalesce(p_gems, 0),
    vip   = vip or coalesce(p_vip, false),
    magic_sauces = v_magic
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object('granted', true,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;
revoke all on function public.apple_iap_grant_apply(uuid,text,text,numeric,bigint,integer,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.apple_iap_grant_apply(uuid,text,text,numeric,bigint,integer,jsonb,boolean) to service_role;

drop function if exists public.business_collect_apply(uuid, numeric, integer, integer);
create or replace function public.business_collect_apply(
  p_user_id uuid, p_income_per_min numeric, p_idle_cap bigint, p_max_idle_min integer
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player     public.players%rowtype;
  v_stats      public.player_stats%rowtype;
  v_elapsed    numeric;
  v_effective  numeric;
  v_collected  bigint;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  if v_player.last_business_collect is null then
    v_elapsed := 0;
  else
    v_elapsed := greatest(0, extract(epoch from (now() - v_player.last_business_collect)) / 60.0);
  end if;
  v_effective := least(v_elapsed, greatest(p_max_idle_min, 0));
  v_collected := least(
    floor(greatest(p_income_per_min, 0) * v_effective)::bigint,
    greatest(p_idle_cap, 0));
  if v_collected < 0 then v_collected := 0; end if;

  update public.players set
    coins = coins + v_collected,
    last_business_collect = now()
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'collected', v_collected,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;
revoke all on function public.business_collect_apply(uuid,numeric,bigint,integer) from public, anon, authenticated;
grant execute on function public.business_collect_apply(uuid,numeric,bigint,integer) to service_role;

drop function if exists public.finalize_round_apply(uuid, text, integer, integer, integer, integer, integer, integer, integer, integer, jsonb, jsonb, integer, integer, integer, integer, boolean, jsonb, jsonb, jsonb);
create or replace function public.finalize_round_apply(
  p_user_id uuid, p_session_id text,
  p_coins_earned bigint, p_biz_bonus bigint, p_gems_earned integer,
  p_level_up_coins bigint, p_level_up_gems integer,
  p_new_xp integer, p_new_level integer, p_new_tier integer,
  p_new_magic_sauces jsonb, p_new_equipped_sauces jsonb,
  p_served integer, p_perfect integer, p_mistakes integer, p_max_combo integer,
  p_sauce_used boolean,
  p_default_daily jsonb, p_default_weekly jsonb, p_default_monthly jsonb
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_player       public.players%rowtype;
  v_cap          bigint;
  v_used         bigint;
  v_remaining    bigint;
  v_allowed      bigint;
  v_coins_granted bigint;
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

  if p_session_id is not null and p_session_id <> ''
     and coalesce(v_player.last_round_session_id, '') = p_session_id then
    select * into v_stats from public.player_stats where player_id = v_player.id;
    return jsonb_build_object(
      'duplicate', true, 'limited', false, 'allowed', 0, 'coins_granted', 0,
      'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
  end if;

  v_today := (now() at time zone 'utc')::date;
  select (last_day_reset is null or last_day_reset < v_today) into v_day_changed
    from public.player_stats where player_id = v_player.id;
  v_day_changed := coalesce(v_day_changed, true);

  v_daily   := coalesce(v_player.daily_missions, '[]'::jsonb);
  v_weekly  := coalesce(v_player.weekly_missions, '[]'::jsonb);
  v_monthly := coalesce(v_player.monthly_missions, '[]'::jsonb);
  if jsonb_array_length(v_daily) = 0 or v_day_changed then v_daily := p_default_daily; end if;
  if jsonb_array_length(v_weekly) = 0 then v_weekly := p_default_weekly; end if;
  if jsonb_array_length(v_monthly) = 0 then v_monthly := p_default_monthly; end if;

  -- Hourly wallet cap REMOVED (2026-08-01, owner decision); the sentinel is
  -- effectively infinite (int8 max). earnings_log keeps recording for analytics.
  v_cap := 9223372036854775807;
  select coalesce(sum(coins), 0) into v_used
    from public.earnings_log
    where player_id = v_player.id and logged_at >= now() - interval '1 hour';
  v_remaining := greatest(0, v_cap - v_used);
  v_allowed   := greatest(0, least(greatest(p_coins_earned, 0), v_remaining));
  if v_allowed > 0 then
    insert into public.earnings_log (player_id, coins) values (v_player.id, v_allowed);
  end if;
  v_coins_granted := v_allowed + greatest(p_biz_bonus, 0);

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
revoke all on function public.finalize_round_apply(uuid,text,bigint,bigint,integer,bigint,integer,integer,integer,integer,jsonb,jsonb,integer,integer,integer,integer,boolean,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.finalize_round_apply(uuid,text,bigint,bigint,integer,bigint,integer,integer,integer,integer,jsonb,jsonb,integer,integer,integer,integer,boolean,jsonb,jsonb,jsonb) to service_role;

drop function if exists public.leaderboard_upsert_best(uuid, text, text, integer, integer, integer, boolean, integer, integer, integer, boolean);
create or replace function public.leaderboard_upsert_best(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_round_score   bigint,
  p_customers     bigint,
  p_max_combo     bigint,
  p_all_periods   boolean default true
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_cats    text[] := array['round_score','customers_served','max_combo'];
  v_scores  bigint[];
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
revoke all on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,bigint,bigint,bigint,boolean) from public, anon, authenticated;
grant execute on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,bigint,bigint,bigint,boolean) to service_role;

drop function if exists public.challenge_upsert_best(uuid, text, text, integer, integer, integer, boolean, integer);
create or replace function public.challenge_upsert_best(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_score         bigint
) returns void
language plpgsql security definer set search_path = public
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
revoke all on function public.challenge_upsert_best(uuid,text,text,integer,integer,integer,boolean,bigint) from public, anon, authenticated;
grant execute on function public.challenge_upsert_best(uuid,text,text,integer,integer,integer,boolean,bigint) to service_role;
