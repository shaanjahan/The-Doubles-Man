-- IAP: purchases ledger + apple_iap_grant_apply (the exactly-once grant).
--
-- Consumables have NO restore path, so the grant MUST be exactly-once and
-- durable. The Base44 version granted (Player.update) and recorded the
-- idempotency row (PurchaseOrder.create) as two separate writes — a crash
-- between them could double-grant on retry. Here the idempotency insert and the
-- currency grant happen in ONE transaction: the unique(checkout_id) constraint
-- + INSERT ... ON CONFLICT DO NOTHING make a replayed transaction a no-op grant.

create table if not exists public.purchases (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  checkout_id text not null unique,          -- 'apple_' || transactionId
  product_id  text not null,
  amount      numeric,
  status      text not null default 'completed',
  created_at  timestamptz not null default now()
);

alter table public.purchases enable row level security;

drop policy if exists "purchases owner read" on public.purchases;
create policy "purchases owner read"
  on public.purchases for select using (owner_id = auth.uid());

-- No write policy => only service_role (RLS-bypassing) writes.
grant select on public.purchases to authenticated;
grant select, insert, update, delete on public.purchases to service_role;

-- Atomic, exactly-once IAP grant. The edge function has already verified the
-- signed Apple JWS and computed the grant deltas from the SERVER product table.
create or replace function public.apple_iap_grant_apply(
  p_user_id     uuid,
  p_checkout_id text,
  p_product_id  text,
  p_amount      numeric,
  p_coins       integer,
  p_gems        integer,
  p_sauce_ids   jsonb,
  p_vip         boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player  public.players%rowtype;
  v_stats   public.player_stats%rowtype;
  v_new_id  uuid;
  v_magic   jsonb;
  v_id      text;
begin
  -- Lock the player row; serializes concurrent verifies of the same purchase.
  select * into v_player from public.players where user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('error', 'no_player');
  end if;

  -- Idempotency: insert the purchase row. On conflict (replay) grant nothing.
  insert into public.purchases (owner_id, checkout_id, product_id, amount)
  values (p_user_id, p_checkout_id, p_product_id, p_amount)
  on conflict (checkout_id) do nothing
  returning id into v_new_id;

  if v_new_id is null then
    select * into v_stats from public.player_stats where player_id = v_player.id;
    return jsonb_build_object('alreadyGranted', true,
      'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
  end if;

  -- Newly recorded -> apply the grant in the SAME transaction.
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
    coins = coins + coalesce(p_coins, 0),
    gems  = gems  + coalesce(p_gems, 0),
    vip   = vip or coalesce(p_vip, false),
    magic_sauces = v_magic
  where id = v_player.id
  returning * into v_player;

  select * into v_stats from public.player_stats where player_id = v_player.id;

  return jsonb_build_object('granted', true,
    'player', to_jsonb(v_player), 'stats', to_jsonb(v_stats));
end;
$$;

revoke all on function public.apple_iap_grant_apply(uuid,text,text,numeric,integer,integer,jsonb,boolean) from public;
grant execute on function public.apple_iap_grant_apply(uuid,text,text,numeric,integer,integer,jsonb,boolean) to service_role;
