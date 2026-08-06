-- Bara Stock: per-round doubles supply, tiered by vendor rank, with paid
-- investment (pre-round crates) and mid-round restocks at escalating prices.
-- Investment is charged UP-FRONT and is non-refundable (cooked channa doesn't
-- keep) — quitting or crashing forfeits unsold stock by default, with no
-- refund path to exploit. Earnings themselves still salvage on crash.
--
-- players.pending_round_stock: the single in-flight round's allowance,
-- keyed by the round sessionId. finalize-round validates served <= allowance
-- and clears it. Abandoned rounds simply leave a stale record that the next
-- start overwrites (money already spent = the forfeit).

alter table public.players
  add column if not exists pending_round_stock jsonb;

-- Charge the pre-round investment and register the allowance. Row-locked so
-- concurrent calls can't double-spend. Cost/allowance are computed by the
-- start-round Edge Function from the shared catalog (server-priced).
create or replace function public.round_stock_start(
  p_user_id    uuid,
  p_session_id text,
  p_allowance  integer,
  p_cost       bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players%rowtype;
begin
  select * into v_player from players where user_id = p_user_id for update;
  if not found then return jsonb_build_object('error', 'no_player'); end if;
  if v_player.coins < p_cost then
    return jsonb_build_object('error', 'insufficient', 'cost', p_cost);
  end if;
  update players set
    coins = coins - p_cost,
    pending_round_stock = jsonb_build_object(
      'session_id', p_session_id,
      'allowance', p_allowance,
      'spent', p_cost,
      'restocks', 0
    )
  where user_id = p_user_id;
  select * into v_player from players where user_id = p_user_id;
  return jsonb_build_object('ok', true, 'coins', v_player.coins,
                            'allowance', p_allowance);
end;
$$;

-- Mid-round restock: extend the SAME session's allowance for an escalating
-- price (validated + priced by the Edge Function; escalation count is
-- tracked here so the function can price the next one).
create or replace function public.round_stock_restock(
  p_user_id    uuid,
  p_session_id text,
  p_add        integer,
  p_cost       bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player players%rowtype;
  v_stock jsonb;
begin
  select * into v_player from players where user_id = p_user_id for update;
  if not found then return jsonb_build_object('error', 'no_player'); end if;
  v_stock := v_player.pending_round_stock;
  if v_stock is null or (v_stock->>'session_id') is distinct from p_session_id then
    return jsonb_build_object('error', 'no_round');
  end if;
  if v_player.coins < p_cost then
    return jsonb_build_object('error', 'insufficient', 'cost', p_cost);
  end if;
  update players set
    coins = coins - p_cost,
    pending_round_stock = jsonb_set(jsonb_set(v_stock,
      '{allowance}', to_jsonb((v_stock->>'allowance')::int + p_add)),
      '{restocks}', to_jsonb((v_stock->>'restocks')::int + 1))
  where user_id = p_user_id;
  select * into v_player from players where user_id = p_user_id;
  return jsonb_build_object('ok', true, 'coins', v_player.coins,
    'allowance', (v_player.pending_round_stock->>'allowance')::int,
    'restocks', (v_player.pending_round_stock->>'restocks')::int);
end;
$$;

revoke all on function public.round_stock_start(uuid,text,integer,bigint) from public;
grant execute on function public.round_stock_start(uuid,text,integer,bigint) to service_role;
revoke all on function public.round_stock_restock(uuid,text,integer,bigint) from public;
grant execute on function public.round_stock_restock(uuid,text,integer,bigint) to service_role;
