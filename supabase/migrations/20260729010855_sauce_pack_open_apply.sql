-- openSaucePack economy RPC. The edge function rolls the sauce ids server-side
-- (client can't be trusted to roll loot) and passes them in; this RPC does the
-- gem deduction + inventory grant atomically under a row lock. The gem cost is
-- passed from _shared/catalog.ts (SAUCE_PACK_GEM_COST); the client's costGems is
-- ignored entirely by the edge function.

create or replace function public.sauce_pack_open_apply(
  p_user_id   uuid,
  p_cost_gems integer,
  p_sauce_ids jsonb   -- array of sauce id strings rolled by the edge function
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_magic  jsonb;
  v_id     text;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  if coalesce(v_player.gems, 0) < p_cost_gems then
    return jsonb_build_object('error', 'insufficient', 'cost', p_cost_gems);
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
    gems = gems - p_cost_gems,
    magic_sauces = v_magic
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object(
    'cost', p_cost_gems,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.sauce_pack_open_apply(uuid,integer,jsonb) from public;
grant execute on function public.sauce_pack_open_apply(uuid,integer,jsonb) to service_role;
