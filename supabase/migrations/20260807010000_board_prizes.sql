-- Board prizes: the daily/weekly/monthly leaderboards pay out cash + gems to
-- the top 3 of every category when their period ends (midnight Trinidad time).
-- Owner-approved amounts (2026-08-07):
--   daily   (6 cats, incl. Today's Rush): $250,000/50g · $100,000/25g · $50,000/10g
--   weekly  (5 cats):                     $450,000/125g · $300,000/100g · $150,000/75g
--   monthly (5 cats):                     $2,000,000/250g · $500,000/125g · $250,000/100g
-- The weekly Best Round #1 additionally wears the "Vendor of the Week" crown
-- (client renders it from current_crown()).
--
-- Design: awards run in a pg_cron job at 04:10 UTC = 00:10 America/Port_of_Spain
-- (fixed UTC-4), right after the boards' key rollover. board_prizes rows are the
-- idempotency ledger — unique (period, period_key, category, place), and wallet
-- credit happens ONLY when the insert lands, so a re-run can never double-pay.
-- Prizes are credited immediately; the `seen` flag only drives the client's
-- celebration popup.

create table if not exists public.board_prizes (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  period text not null,
  period_key text not null,
  category text not null,
  place int not null,
  score bigint not null,
  cash bigint not null,
  gems int not null,
  display_name text,
  awarded_at timestamptz not null default now(),
  seen boolean not null default false,
  unique (period, period_key, category, place)
);

create index if not exists board_prizes_owner_unseen
  on public.board_prizes (owner_id) where not seen;

alter table public.board_prizes enable row level security;

drop policy if exists board_prizes_select_own on public.board_prizes;
create policy board_prizes_select_own on public.board_prizes
  for select to authenticated using (owner_id = auth.uid());

-- Client may only flip its own rows' `seen` flag (column-level grant below).
drop policy if exists board_prizes_update_own on public.board_prizes;
create policy board_prizes_update_own on public.board_prizes
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke all on public.board_prizes from anon, authenticated;
grant select on public.board_prizes to authenticated;
grant update (seen) on public.board_prizes to authenticated;
grant all on public.board_prizes to service_role;

-- Award one finished board: top 3 per category by score (ties break to whoever
-- set the score first), zero scores never place. Returns rows actually paid.
create or replace function public.award_board_prizes(p_period text, p_key text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cats text[];
  v_cash bigint[];
  v_gems int[];
  v_cat text;
  r record;
  v_place int;
  v_paid int := 0;
  v_id bigint;
begin
  if p_period = 'daily' then
    v_cats := array['round_score','customers_served','max_combo','total_earnings','biz_value','daily_challenge'];
    v_cash := array[250000, 100000, 50000]::bigint[];
    v_gems := array[50, 25, 10];
  elsif p_period = 'weekly' then
    v_cats := array['round_score','customers_served','max_combo','total_earnings','biz_value'];
    v_cash := array[450000, 300000, 150000]::bigint[];
    v_gems := array[125, 100, 75];
  elsif p_period = 'monthly' then
    v_cats := array['round_score','customers_served','max_combo','total_earnings','biz_value'];
    v_cash := array[2000000, 500000, 250000]::bigint[];
    v_gems := array[250, 125, 100];
  else
    raise exception 'award_board_prizes: bad period %', p_period;
  end if;

  foreach v_cat in array v_cats loop
    v_place := 0;
    for r in
      select e.owner_id, e.display_name, e.score
      from public.leaderboard_entries e
      where e.period = p_period
        and e.period_key = p_key
        and e.category = v_cat
        and e.score > 0
      order by e.score desc, e.updated_at asc
      limit 3
    loop
      v_place := v_place + 1;
      v_id := null;
      insert into public.board_prizes
        (owner_id, period, period_key, category, place, score, cash, gems, display_name)
      values
        (r.owner_id, p_period, p_key, v_cat, v_place, r.score,
         v_cash[v_place], v_gems[v_place], r.display_name)
      on conflict (period, period_key, category, place) do nothing
      returning id into v_id;
      if v_id is not null then
        update public.players
          set coins = coins + v_cash[v_place],
              gems  = gems  + v_gems[v_place]
        where user_id = r.owner_id;
        v_paid := v_paid + 1;
      end if;
    end loop;
  end loop;

  return v_paid;
end;
$$;

-- Cron entrypoint: figure out which periods just ended in Trinidad time and
-- award them. Daily fires every run; weekly only Monday (ISO week ended
-- Sunday); monthly only on the 1st. Safe to re-run any time — the ledger's
-- unique key makes every award once-only.
create or replace function public.award_finished_boards()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Port_of_Spain')::date;
  v_msg text;
begin
  v_msg := 'daily ' || to_char(v_today - 1, 'YYYY-MM-DD') || ': '
        || public.award_board_prizes('daily', to_char(v_today - 1, 'YYYY-MM-DD'));

  if extract(isodow from v_today) = 1 then
    v_msg := v_msg || ' · weekly ' || to_char(v_today - 1, 'IYYY-"W"IW') || ': '
          || public.award_board_prizes('weekly', to_char(v_today - 1, 'IYYY-"W"IW'));
  end if;

  if extract(day from v_today) = 1 then
    v_msg := v_msg || ' · monthly ' || to_char(v_today - 1, 'YYYY-MM') || ': '
          || public.award_board_prizes('monthly', to_char(v_today - 1, 'YYYY-MM'));
  end if;

  return v_msg;
end;
$$;

-- Award passes are server-only: cron (postgres) and service_role.
revoke all on function public.award_board_prizes(text, text) from public, anon, authenticated;
revoke all on function public.award_finished_boards() from public, anon, authenticated;
grant execute on function public.award_board_prizes(text, text) to service_role;
grant execute on function public.award_finished_boards() to service_role;

-- Reigning Vendor of the Week: the most recent weekly Best Round #1. Publicly
-- readable (definer bypasses the own-rows RLS) so every board can crown them.
create or replace function public.current_crown()
returns table (owner_id uuid, display_name text, period_key text)
language sql
stable
security definer
set search_path = public
as $$
  select bp.owner_id, bp.display_name, bp.period_key
  from public.board_prizes bp
  where bp.period = 'weekly' and bp.category = 'round_score' and bp.place = 1
  order by bp.awarded_at desc
  limit 1;
$$;

-- Functions default to EXECUTE for PUBLIC — revoke so only signed-in players
-- (and the definer paths) can read the crown. (Tightened post-ship after an
-- anon-key probe showed the default grant leaking through.)
revoke all on function public.current_crown() from public, anon;
grant execute on function public.current_crown() to authenticated;

-- Nightly award pass at 00:10 Trinidad time (04:10 UTC — POS is fixed UTC-4,
-- no DST). cron.schedule upserts by job name.
create extension if not exists pg_cron;
select cron.schedule('award-board-prizes', '10 4 * * *', $$select public.award_finished_boards()$$);
