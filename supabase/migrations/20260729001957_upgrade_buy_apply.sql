-- buyUpgrade economy RPC. Same row-locking pattern as business_buy_apply:
-- the cost is computed UNDER LOCK from the authoritative current level, so a
-- concurrent buy can't purchase the next level at a stale (lower) price, and
-- the max-level / affordability checks are atomic with the deduction.
--
-- The catalog (baseCost / growth / maxLevel) is single-sourced in
-- supabase/functions/_shared/catalog.ts and passed in by the edge function;
-- this RPC holds no upgrade constants of its own.

create or replace function public.upgrade_buy_apply(
  p_user_id    uuid,
  p_upgrade_id text,
  p_base_cost  numeric,
  p_growth     numeric,
  p_max_level  integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_cur    integer;
  v_cost   integer;
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

  v_cost := floor(p_base_cost * power(p_growth, v_cur))::integer;

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

revoke all on function public.upgrade_buy_apply(uuid,text,numeric,numeric,integer) from public;
grant execute on function public.upgrade_buy_apply(uuid,text,numeric,numeric,integer) to service_role;
