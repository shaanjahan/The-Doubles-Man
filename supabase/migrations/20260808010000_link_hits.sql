-- Attribution for social download links (thedoublesman.com/app?src=...).
-- Written only by the track-link Edge Function (service role); no client
-- access. One row per tap: source tag, detected platform, user agent.
create table if not exists public.link_hits (
  id bigint generated always as identity primary key,
  src text not null default 'direct',
  platform text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.link_hits enable row level security;
revoke all on public.link_hits from anon, authenticated;
grant all on public.link_hits to service_role;
