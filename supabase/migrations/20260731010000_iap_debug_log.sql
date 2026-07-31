-- Temporary-but-harmless diagnostics for apple-iap-verify: the platform logs
-- API isn't queryable from tooling, so the function records each verify
-- attempt's outcome here (reason + decoded tx summary, never the raw JWS).
-- Service-role only; no client can read or write it.

create table if not exists public.iap_debug_log (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid,
  stage      text not null,   -- e.g. 'verify_fail' | 'decoded' | 'reject_bundle' | 'grant_fail' | 'granted'
  detail     jsonb
);

alter table public.iap_debug_log enable row level security;
revoke all on public.iap_debug_log from anon, authenticated;
grant select, insert, delete on public.iap_debug_log to service_role;
