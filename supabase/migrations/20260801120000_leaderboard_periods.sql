-- Period leaderboards: Daily / Weekly / Monthly / All-Time boards, each with
-- the three categories (round_score, customers_served, max_combo).
--
-- *** PARKED ON feature/fleet-idle-cap — DO NOT APPLY UNTIL THE POST-REVIEW
-- *** FEATURE DROP. Ship order (same sitting, in this order):
-- ***   1. apply this migration (Management API database/query + pgrst reload)
-- ***   2. merge branch -> Netlify deploys the period-aware UI
-- ***   3. deploy ensure-player (seed writes alltime only) — finalize-round
-- ***      needs NO redeploy (unchanged args; default writes all periods)
-- *** Between 1 and the web deploy, stale clients may transiently see
-- *** duplicate rows (they query without a period filter); force-close fixes.
--
-- Design: a "reset" is nothing but the calendar rolling to a new period_key
-- ('' for alltime, '2026-08-01', '2026-W31', '2026-08' — all UTC, matching the
-- game's existing UTC daily resets). No cron, no wipes; old periods remain as
-- history. Existing rows (including the restored Base44 legacy scores) default
-- to period='alltime' and stay exactly where they belong.

alter table public.leaderboard_entries
  add column if not exists period text not null default 'alltime',
  add column if not exists period_key text not null default '';

-- One best row per player per category PER BOARD now.
alter table public.leaderboard_entries
  drop constraint if exists leaderboard_entries_owner_id_category_key;
alter table public.leaderboard_entries
  add constraint leaderboard_entries_owner_cat_period_key
  unique (owner_id, category, period, period_key);

create index if not exists leaderboard_entries_period_board_idx
  on public.leaderboard_entries (period, period_key, category, score desc);

-- Recreate the best-score writer: same only-if-greater + identity-refresh
-- semantics, now applied to every active board. p_all_periods=false writes
-- alltime only — used by ensure-player's historical seed so migrated Base44
-- bests can't top a daily/weekly board the player didn't earn today.
drop function if exists public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer);

create function public.leaderboard_upsert_best(
  p_owner_id      uuid,
  p_display_name  text,
  p_avatar_emoji  text,
  p_location_id   integer,
  p_business_tier integer,
  p_level         integer,
  p_vip           boolean,
  p_round_score   integer,
  p_customers     integer,
  p_max_combo     integer,
  p_all_periods   boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cats    text[] := array['round_score','customers_served','max_combo'];
  v_scores  integer[];
  v_periods text[];
  v_keys    text[];
  i int; j int;
begin
  v_scores := array[p_round_score, p_customers, p_max_combo];
  if p_all_periods then
    v_periods := array['alltime','daily','weekly','monthly'];
    v_keys := array[
      '',
      to_char(now() at time zone 'utc', 'YYYY-MM-DD'),
      to_char(now() at time zone 'utc', 'IYYY-"W"IW'),
      to_char(now() at time zone 'utc', 'YYYY-MM')
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

revoke all on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer,boolean) from public;
grant execute on function public.leaderboard_upsert_best(uuid,text,text,integer,integer,integer,boolean,integer,integer,integer,boolean) to service_role;
