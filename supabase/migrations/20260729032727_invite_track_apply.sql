-- track-invite RPC. Ports the Base44 client trackInvite (a raw Player.update
-- fired on share). Increments player_stats.invited_friends and lazy-inits the
-- mission lists so the wm_invite_2 weekly mission exists to be bumped (a player
-- may share before ever playing a round). The mission bump + grant is done by
-- the reusable missions_apply RPC after this.
--
-- Note: there is NO invite verification in the source (the client just fires on
-- share), so this increments unconditionally. The only reward is the one-time
-- wm_invite_2 (15 gems, granted once via the mission claimed flag), so the abuse
-- ceiling is 15 gems. Real invite attribution would be a separate feature.

create or replace function public.invite_track_apply(
  p_user_id         uuid,
  p_default_daily   jsonb,
  p_default_weekly  jsonb,
  p_default_monthly jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_daily   jsonb;
  v_weekly  jsonb;
  v_monthly jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  -- Lazy-init empty mission lists (so wm_invite_2 exists to bump).
  v_daily   := coalesce(v_player.daily_missions, '[]'::jsonb);
  v_weekly  := coalesce(v_player.weekly_missions, '[]'::jsonb);
  v_monthly := coalesce(v_player.monthly_missions, '[]'::jsonb);
  if jsonb_array_length(v_daily) = 0 then v_daily := p_default_daily; end if;
  if jsonb_array_length(v_weekly) = 0 then v_weekly := p_default_weekly; end if;
  if jsonb_array_length(v_monthly) = 0 then v_monthly := p_default_monthly; end if;

  update public.players set
    daily_missions   = v_daily,
    weekly_missions  = v_weekly,
    monthly_missions = v_monthly
  where id = v_player.id
  returning * into v_player;

  update public.player_stats set
    invited_friends = invited_friends + 1
  where player_id = v_player.id
  returning * into v_stats;

  return jsonb_build_object('player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.invite_track_apply(uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.invite_track_apply(uuid,jsonb,jsonb,jsonb) to service_role;
