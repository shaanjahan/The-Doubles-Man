-- finalize_round_apply: the atomic economy write for finalize-round.
--
-- The edge function computes the authoritative, clamped rewards in TypeScript
-- (the reward ceiling depends on the player's real upgrades / sauces / tier /
-- location, ported verbatim from Base44). This function performs the parts
-- that MUST be transactional and race-safe against concurrent finalize calls:
--
--   1. Lock the player row (FOR UPDATE).
--   2. Re-check the session-id replay guard UNDER LOCK -- if this round was
--      already finalized, grant nothing and report duplicate.
--   3. Enforce the hourly earnings cap: sum the last hour of earnings_log,
--      compare to hourly_earnings_cap, clamp the gameplay coins to the
--      remaining headroom, and append the earnings_log row -- all inside the
--      same transaction so two concurrent rounds can't both spend the same
--      headroom.
--   4. Apply coins/gems/xp/level/tier/sauces to players and the counter
--      increments to player_stats.
--
-- Cap scope (product decision): only the clamped GAMEPLAY coins are capped.
-- The per-round business bonus and level-up bonus coins are granted on top,
-- uncapped. lifetime_coins / coins_today reflect the actual granted total.
--
-- Returns a jsonb envelope: { duplicate, limited, allowed, coins_granted,
-- player, stats } where player/stats are the authoritative post-write rows,
-- so the edge function can shape the camelCase response without re-reading.

create or replace function public.finalize_round_apply(
  p_user_id            uuid,
  p_session_id         text,
  p_coins_earned       integer,   -- clamped gameplay coins, PRE-cap
  p_biz_bonus          integer,   -- per-round business bonus, uncapped
  p_gems_earned        integer,   -- round gems, PRE level-up
  p_level_up_coins     integer,
  p_level_up_gems      integer,
  p_new_xp             integer,   -- absolute xp remainder after level-up loop
  p_new_level          integer,   -- absolute
  p_new_tier           integer,   -- absolute
  p_new_magic_sauces   jsonb,
  p_new_equipped_sauces jsonb,
  p_served             integer,
  p_perfect            integer,
  p_mistakes           integer,
  p_max_combo          integer,
  p_sauce_used         boolean
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
begin
  -- 1. Lock the caller's player row for the duration of the transaction.
  select * into v_player from public.players
    where user_id = p_user_id
    for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  -- 2. Replay guard under lock. If this session was already finalized, return
  --    the authoritative current state and grant nothing.
  if p_session_id is not null and p_session_id <> ''
     and coalesce(v_player.last_round_session_id, '') = p_session_id then
    select * into v_stats from public.player_stats where player_id = v_player.id;
    return jsonb_build_object(
      'duplicate', true, 'limited', false, 'allowed', 0, 'coins_granted', 0,
      'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
  end if;

  -- 3. Hourly cap. Sum this player's gameplay earnings over the rolling hour.
  v_cap := coalesce(nullif(v_player.hourly_earnings_cap, 0), 3500);
  select coalesce(sum(coins), 0) into v_used
    from public.earnings_log
    where player_id = v_player.id
      and logged_at >= now() - interval '1 hour';
  v_remaining := greatest(0, v_cap - v_used);
  v_allowed   := greatest(0, least(greatest(p_coins_earned, 0), v_remaining));
  if v_allowed > 0 then
    insert into public.earnings_log (player_id, coins) values (v_player.id, v_allowed);
  end if;

  -- Gameplay income actually granted this round (capped) plus the uncapped
  -- business bonus. Level-up coins are added to the player total below but are
  -- not "round income" for stat/cap purposes... except Base44 folded them into
  -- lifetime/coins_today via coinsGranted. We keep coins_granted = capped
  -- gameplay + biz bonus (matches Base44's coinsGranted definition, minus the
  -- forged inflation the cap now removes); level-up coins are tracked
  -- separately and added to the balance only.
  v_coins_granted := v_allowed + greatest(p_biz_bonus, 0);

  -- 4a. Players: balances are deltas on the locked values; level/xp/tier are
  --     absolute (already computed by the caller's level-up loop).
  update public.players set
    coins  = coins + v_coins_granted + greatest(p_level_up_coins, 0),
    gems   = gems  + greatest(p_gems_earned, 0) + greatest(p_level_up_gems, 0),
    xp     = greatest(p_new_xp, 0),
    level  = greatest(p_new_level, 1),
    business_tier   = greatest(p_new_tier, 0),
    magic_sauces    = coalesce(p_new_magic_sauces, magic_sauces),
    equipped_sauces = coalesce(p_new_equipped_sauces, equipped_sauces),
    last_round_session_id = case
      when p_session_id is null or p_session_id = '' then last_round_session_id
      else p_session_id end
  where id = v_player.id
  returning * into v_player;

  -- 4b. player_stats: targeted increments (counters) and maxes. Columns
  --     finalize-round doesn't own (perfect_week, max_combo_week,
  --     invited_friends, favored_sauce, last_day_reset) are left untouched.
  update public.player_stats set
    customers_served = customers_served + greatest(p_served, 0),
    perfect_orders   = perfect_orders   + greatest(p_perfect, 0),
    mistakes         = mistakes         + greatest(p_mistakes, 0),
    rounds_played    = rounds_played    + 1,
    lifetime_coins   = lifetime_coins   + v_coins_granted,
    highest_combo    = greatest(highest_combo, greatest(p_max_combo, 0)),
    served_today     = served_today     + greatest(p_served, 0),
    perfect_today    = perfect_today    + greatest(p_perfect, 0),
    max_combo_today  = greatest(max_combo_today, greatest(p_max_combo, 0)),
    coins_today      = coins_today      + v_coins_granted,
    rounds_today     = rounds_today     + 1,
    served_week      = served_week      + greatest(p_served, 0),
    served_month     = served_month     + greatest(p_served, 0),
    sauce_used_today = sauce_used_today + case when p_sauce_used then 1 else 0 end
  where player_id = v_player.id
  returning * into v_stats;

  return jsonb_build_object(
    'duplicate', false,
    'limited', v_allowed < greatest(p_coins_earned, 0),
    'allowed', v_allowed,
    'coins_granted', v_coins_granted,
    'player', to_jsonb(v_player),
    'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.finalize_round_apply(
  uuid,text,integer,integer,integer,integer,integer,integer,integer,integer,
  jsonb,jsonb,integer,integer,integer,integer,boolean) from public;
grant execute on function public.finalize_round_apply(
  uuid,text,integer,integer,integer,integer,integer,integer,integer,integer,
  jsonb,jsonb,integer,integer,integer,integer,boolean) to service_role;
