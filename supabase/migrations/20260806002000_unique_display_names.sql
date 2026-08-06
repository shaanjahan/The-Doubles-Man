-- Unique vendor names, case/whitespace-insensitive. The 'New Vendor'
-- creation default is excluded so unnamed players can coexist; once a player
-- picks a real name it must be unique game-wide. The index is the hard
-- guarantee — the setup screen's RPC pre-check is just the friendly UX layer,
-- and a race between two claimants is settled here, not in the client.
create unique index if not exists players_display_name_unique
  on public.players (lower(trim(display_name)))
  where lower(trim(display_name)) <> 'new vendor';

-- Availability pre-check for the setup screen. Excludes the caller's own row
-- (re-saving your current name never reads as taken). SECURITY DEFINER
-- because players can only SELECT their own row under RLS.
create or replace function public.display_name_available(p_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.players
    where lower(trim(display_name)) = lower(trim(coalesce(p_name, '')))
      and user_id is distinct from auth.uid()
  );
$$;

revoke all on function public.display_name_available(text) from public;
grant execute on function public.display_name_available(text) to authenticated;
