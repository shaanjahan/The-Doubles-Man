-- Adds a `scope` to player_seed_log so the log records WHAT was seeded, not just
-- THAT something was. Two levels:
--   'partial' — currency / level / tier / location / vip / streak + lifetime
--               stats only (the Player Activity CSV export; no economy engine).
--   'full'    — the above PLUS the jsonb economy fields (upgrades, magic_sauces,
--               equipped_sauces, businesses, achievement_progress, missions) from
--               the full Player entity export.
--
-- Idempotency rule for the full-restore pass: an account logged as 'partial' is
-- STILL ELIGIBLE for a full pass (it must be upgraded to a full restore). Only
-- 'full' is terminal. Default 'partial' backfills every existing row correctly —
-- the one pre-cutover row (ptsudarshan) was a partial seed.

alter table public.player_seed_log
  add column if not exists scope text not null default 'partial'
  check (scope in ('partial', 'full'));
