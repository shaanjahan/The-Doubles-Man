-- manage-business economy RPCs: business_buy_apply + business_collect_apply.
--
-- Both mutate the player's balance, so both run in a single row-locking
-- transaction (security definer, execute -> service_role only) to close the
-- double-spend / double-collect races Base44's read-then-write couldn't.
--
-- The catalog (cost curve, income rates, idle caps) stays single-sourced in
-- supabase/functions/_shared/businesses.ts. The edge function passes the
-- relevant catalog values in as parameters; these functions contain no catalog
-- constants of their own.

-- Buy one unit of a business tier. Cost is computed UNDER LOCK from the
-- authoritative owned-count so a concurrent buy can't purchase the next unit at
-- a stale (lower) price.
create or replace function public.business_buy_apply(
  p_user_id     uuid,
  p_tier        integer,
  p_unlock_tier integer,
  p_base_cost   numeric,
  p_cost_growth numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_owned  integer;
  v_cost   integer;
  v_next   jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  if coalesce(v_player.business_tier, 0) < p_unlock_tier then
    return jsonb_build_object('error', 'locked');
  end if;

  -- Current owned count for this tier (0 if not yet owned).
  select coalesce((
    select (elem->>'count')::integer
    from jsonb_array_elements(v_player.businesses) elem
    where (elem->>'tier')::integer = p_tier
    limit 1), 0)
  into v_owned;

  v_cost := floor(p_base_cost * power(p_cost_growth, v_owned))::integer;

  if coalesce(v_player.coins, 0) < v_cost then
    return jsonb_build_object('error', 'insufficient', 'cost', v_cost);
  end if;

  -- businesses with this tier's count incremented (append if absent).
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
    -- Seed the idle clock on the first purchase so the first collect isn't a
    -- cold-start 0.
    last_business_collect = coalesce(last_business_collect, now())
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'cost', v_cost, 'bought', p_tier,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.business_buy_apply(uuid,integer,integer,numeric,numeric) from public;
grant execute on function public.business_buy_apply(uuid,integer,integer,numeric,numeric) to service_role;


-- Collect accrued idle income. incomePerMin + idle_cap are computed by the
-- edge function from the shared catalog (businesses/tier only ever increase, so
-- a pre-lock value can only under-credit, never over-credit). Elapsed time is
-- measured UNDER LOCK against the authoritative last_business_collect, which is
-- what actually prevents a double-collect. The rolling hourly cap is NOT
-- applied here -- idle income has its own IDLE_CAPS / MAX_IDLE_MINUTES bounds.
create or replace function public.business_collect_apply(
  p_user_id        uuid,
  p_income_per_min numeric,
  p_idle_cap       integer,
  p_max_idle_min   integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player     public.players%rowtype;
  v_stats      public.player_stats%rowtype;
  v_elapsed    numeric;
  v_effective  numeric;
  v_collected  integer;
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
    floor(greatest(p_income_per_min, 0) * v_effective)::integer,
    greatest(p_idle_cap, 0));
  if v_collected < 0 then v_collected := 0; end if;

  update public.players set
    coins = coins + v_collected,
    last_business_collect = now()   -- always advance the clock, even at 0
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'collected', v_collected,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.business_collect_apply(uuid,numeric,integer,integer) from public;
grant execute on function public.business_collect_apply(uuid,numeric,integer,integer) to service_role;
