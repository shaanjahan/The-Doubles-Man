-- leaderboard_upsert_best: keep the SCORE as the all-time best per category, but
-- always refresh the player's identity (name/avatar/level/tier/vip/location) on
-- every round.
--
-- Before: the whole ON CONFLICT update was gated on `excluded.score > current`,
-- so a player who changed their avatar/name but didn't beat their high score
-- kept a stale icon on the board. Now: score = greatest(new, current) (never
-- lowers), and the metadata columns update unconditionally. Callers are
-- unchanged (finalize-round each round; ensure-player's one-time historical
-- seed) — the seed still can't lower a live score because of greatest().

create or replace function public.leaderboard_upsert_best(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_round_score   integer,
  p_customers     integer,
  p_max_combo     integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.leaderboard_entries
    (owner_id, category, score, display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'round_score', p_round_score, p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category) do update
    set score = greatest(excluded.score, public.leaderboard_entries.score),
        display_name = excluded.display_name, avatar_emoji = excluded.avatar_emoji,
        location_id = excluded.location_id, business_tier = excluded.business_tier,
        level = excluded.level, vip = excluded.vip, updated_at = now();

  insert into public.leaderboard_entries
    (owner_id, category, score, display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'customers_served', p_customers, p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category) do update
    set score = greatest(excluded.score, public.leaderboard_entries.score),
        display_name = excluded.display_name, avatar_emoji = excluded.avatar_emoji,
        location_id = excluded.location_id, business_tier = excluded.business_tier,
        level = excluded.level, vip = excluded.vip, updated_at = now();

  insert into public.leaderboard_entries
    (owner_id, category, score, display_name, avatar_emoji, location_id, business_tier, level, vip)
  values
    (p_owner_id, 'max_combo', p_max_combo, p_display_name, p_avatar_emoji, p_location_id, p_business_tier, p_level, p_vip)
  on conflict (owner_id, category) do update
    set score = greatest(excluded.score, public.leaderboard_entries.score),
        display_name = excluded.display_name, avatar_emoji = excluded.avatar_emoji,
        location_id = excluded.location_id, business_tier = excluded.business_tier,
        level = excluded.level, vip = excluded.vip, updated_at = now();
end;
$$;

revoke all on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer) from public;
grant execute on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer) to service_role;
