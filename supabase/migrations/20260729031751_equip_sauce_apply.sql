-- equip-sauce economy RPC. equipped_sauces is SECURITY-SENSITIVE: finalize-round
-- reads it to apply reward-ceiling multipliers (golden_tamarind coinMult x2,
-- double_trouble doubleServe, ghost_pepper spawn, pepper_fairy tips) WITHOUT an
-- ownership check. If a client could write equipped_sauces directly it could
-- equip a sauce it doesn't own and inflate its finalize-round ceiling, letting
-- forged coin amounts pass the clamp. So this RPC enforces ownership at equip
-- time and equipped_sauces is never client-writable.
--
-- Faithful toggle (usePlayer.js toggleEquipSauce), against the LOCKED state:
--   * already equipped        -> unequip (no ownership check)
--   * not equipped, < 2 slots -> equip (append)        [ownership required]
--   * not equipped, 2 slots   -> replace slot [1]       [ownership required]

create or replace function public.equip_sauce_apply(
  p_user_id  uuid,
  p_sauce_id text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player   public.players%rowtype;
  v_stats    public.player_stats%rowtype;
  v_equipped jsonb;
  v_new      jsonb;
  v_owned    boolean;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  v_equipped := coalesce(v_player.equipped_sauces, '[]'::jsonb);

  if v_equipped ? p_sauce_id then
    -- Already equipped -> unequip. Removal is always allowed.
    v_new := v_equipped - p_sauce_id;
  else
    -- Equip -> require ownership (in magic_sauces with count > 0). THIS is the
    -- guard that protects finalize-round's ceiling.
    select exists (
      select 1 from jsonb_array_elements(coalesce(v_player.magic_sauces, '[]'::jsonb)) e
      where e ->> 'id' = p_sauce_id and coalesce((e ->> 'count')::integer, 0) > 0
    ) into v_owned;
    if not v_owned then
      return jsonb_build_object('error', 'not_owned');
    end if;

    if jsonb_array_length(v_equipped) < 2 then
      v_new := v_equipped || jsonb_build_array(p_sauce_id);
    else
      -- Two slots full -> replace the SECOND slot, preserve the first.
      v_new := jsonb_build_array(v_equipped -> 0, to_jsonb(p_sauce_id));
    end if;
  end if;

  update public.players set equipped_sauces = v_new where id = v_player.id
  returning * into v_player;
  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object('equipped', v_new, 'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.equip_sauce_apply(uuid,text) from public;
grant execute on function public.equip_sauce_apply(uuid,text) to service_role;
