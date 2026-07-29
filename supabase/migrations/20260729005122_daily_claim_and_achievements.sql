-- claimDaily economy: daily_claim_apply (the claim) + achievements_apply (the
-- reusable, idempotent achievement granter used by claimDaily now and by
-- openSaucePack / the finalize-round retrofit later).
--
-- Ports the Base44 GAME-HOOK claimDaily (src/lib/game/usePlayer.js) against the
-- Player model — NOT the dead claim-daily-reward/PlayerProfile path. UTC
-- calendar day, gap-reset streak, catalog.js DAILY_REWARDS. Reward table is
-- passed in from _shared/catalog.ts; this RPC holds no reward constants.

-- ---- daily_claim_apply ----
create or replace function public.daily_claim_apply(
  p_user_id uuid,
  p_rewards jsonb,   -- DAILY_REWARDS array from _shared/catalog.ts
  p_max_day integer  -- DAILY_REWARDS.length (7)
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

  -- UTC calendar day, forced regardless of DB session timezone.
  v_today := (now() at time zone 'utc')::date;

  if v_player.last_daily_claim = v_today then
    return jsonb_build_object('error', 'already_claimed');
  end if;

  -- Streak: continue only if the last claim was exactly yesterday (UTC);
  -- otherwise a missed day resets it. Then +1 for today's claim.
  if v_player.last_daily_claim is null then
    v_streak := 0;
  elsif v_player.last_daily_claim <> (v_today - 1) then
    v_streak := 0;
  else
    v_streak := coalesce(v_player.daily_streak, 0);
  end if;
  v_streak := v_streak + 1;

  v_day := least(v_streak, p_max_day);
  v_reward := p_rewards -> (v_day - 1);

  v_coins := v_player.coins + coalesce((v_reward ->> 'coins')::integer, 0);
  v_gems  := v_player.gems  + coalesce((v_reward ->> 'gems')::integer, 0);
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
    'streak', v_streak, 'day', v_day, 'reward', v_reward,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.daily_claim_apply(uuid,jsonb,integer) from public;
grant execute on function public.daily_claim_apply(uuid,jsonb,integer) to service_role;


-- ---- achievements_apply (reusable, idempotent) ----
-- The edge function evaluates achievements in TS (_shared/catalog.ts) against
-- the authoritative post-mutation state, then calls this to grant them. Grants
-- only for achievements NOT already marked claimed in the DB (re-checked under
-- lock), so re-evaluation / retries can never double-grant. p_progress is
-- merged into achievement_progress (value updates + claimed marks).
create or replace function public.achievements_apply(
  p_user_id  uuid,
  p_grants   jsonb,   -- array of { id, coins, gems } for newly-unlocked achievements
  p_progress jsonb    -- achievement_progress entries to merge
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
  g        jsonb;
begin
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  for g in select * from jsonb_array_elements(coalesce(p_grants, '[]'::jsonb)) loop
    if coalesce((v_player.achievement_progress -> (g ->> 'id') ->> 'claimed')::boolean, false) = false then
      v_coins := v_coins + coalesce((g ->> 'coins')::integer, 0);
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

revoke all on function public.achievements_apply(uuid,jsonb,jsonb) from public;
grant execute on function public.achievements_apply(uuid,jsonb,jsonb) to service_role;
