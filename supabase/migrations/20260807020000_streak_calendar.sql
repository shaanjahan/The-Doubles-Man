-- Streak calendar: 30-day escalating daily rewards + streak repair, and the
-- streak day moves from UTC to Trinidad time (America/Port_of_Spain, fixed
-- UTC-4) to match the boards' midnight-local rollover.
--
-- Changes vs the old daily_claim_apply:
--   * v_today is the Trinidad calendar day (was UTC).
--   * TRANSITION GUARD: already-claimed check is last_daily_claim >= v_today
--     (not =). Players who claimed during 8 PM–midnight Trinidad hold a UTC
--     date one day AHEAD of the Trinidad date; with '=' they could claim twice
--     (and have their streak reset by the gap branch). With '>=' they simply
--     wait for the next Trinidad day — streak intact, no double claim.
--   * Reward day: streak <= p_max_day (30) uses the table directly; past 30
--     the streak keeps counting but the reward loops p_loop_start..p_max_day
--     (24..30) forever.
--   * Streak repair: p_repair with last claim exactly 2 days back and a streak
--     of at least p_repair_min lets the player pay p_repair_cost gems to keep
--     the streak instead of resetting. Distinct errors (repair_unavailable /
--     not_enough_gems) so the client can fall back to a plain claim.
--
-- The old 3-arg signature is dropped so PostgREST named-arg calls stay
-- unambiguous; the new params all have defaults, so the not-yet-redeployed
-- claim-daily function keeps working against this single function.

drop function if exists public.daily_claim_apply(uuid, jsonb, integer);

create or replace function public.daily_claim_apply(
  p_user_id uuid,
  p_rewards jsonb,   -- DAILY_REWARDS array from _shared/catalog.ts
  p_max_day integer, -- DAILY_REWARDS.length (30)
  p_loop_start integer default 24,
  p_repair boolean default false,
  p_repair_cost integer default 25,
  p_repair_min integer default 3
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_stats  public.player_stats%rowtype;
  v_today  date;
  v_streak integer;
  v_day    integer;
  v_reward jsonb;
  v_repaired boolean := false;
  v_coins  integer;
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

  -- Trinidad calendar day, forced regardless of DB session timezone.
  v_today := (now() at time zone 'America/Port_of_Spain')::date;

  -- '>=' — see transition guard note in the header comment.
  if v_player.last_daily_claim >= v_today then
    return jsonb_build_object('error', 'already_claimed');
  end if;

  -- Streak: continue if the last claim was exactly yesterday; a single missed
  -- day is repairable for gems (streak >= p_repair_min); otherwise reset.
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

  -- Reward day: table position for the first 30 days, then the 24..30 loop.
  if v_streak <= p_max_day then
    v_day := v_streak;
  else
    v_day := p_loop_start + ((v_streak - p_loop_start) % (p_max_day - p_loop_start + 1));
  end if;
  v_reward := p_rewards -> (v_day - 1);

  v_coins := v_player.coins + coalesce((v_reward ->> 'coins')::integer, 0);
  v_gems  := v_player.gems  + coalesce((v_reward ->> 'gems')::integer, 0)
           - (case when v_repaired then p_repair_cost else 0 end);
  v_xp    := v_player.xp    + coalesce((v_reward ->> 'xp')::integer, 0);
  v_level := v_player.level;

  -- Level-up loop (server-authoritative; same math as finalize-round). A daily
  -- xp reward can push a player over a threshold.
  loop
    v_need := floor(80 * power(1.18, v_level - 1))::integer;
    exit when v_xp < v_need;
    v_xp := v_xp - v_need;
    v_level := v_level + 1;
    v_coins := v_coins + (100 + v_level * 25);
    v_gems := v_gems + greatest(1, v_level / 5);  -- integer floor division
  end loop;

  -- Business tier from server LVL_REQS [1,5,9,14,19,25,32] (never downgrades).
  v_tier := coalesce(v_player.business_tier, 0);
  if    v_level >= 32 then v_tier := greatest(v_tier, 6);
  elsif v_level >= 25 then v_tier := greatest(v_tier, 5);
  elsif v_level >= 19 then v_tier := greatest(v_tier, 4);
  elsif v_level >= 14 then v_tier := greatest(v_tier, 3);
  elsif v_level >= 9  then v_tier := greatest(v_tier, 2);
  elsif v_level >= 5  then v_tier := greatest(v_tier, 1);
  end if;

  -- Sauce reward -> magic_sauces (increment if owned, else append).
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

revoke all on function public.daily_claim_apply(uuid,jsonb,integer,integer,boolean,integer,integer) from public;
grant execute on function public.daily_claim_apply(uuid,jsonb,integer,integer,boolean,integer,integer) to service_role;
