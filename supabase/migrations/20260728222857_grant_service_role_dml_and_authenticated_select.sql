-- Restore service_role DML and grant authenticated SELECT on the three
-- game-state tables (players, player_stats, earnings_log).
--
-- Why this exists:
-- An earlier schema-tightening pass ran a broad REVOKE that stripped
-- service_role of SELECT/INSERT/UPDATE/DELETE on all three tables, leaving
-- only REFERENCES/TRIGGER/TRUNCATE. That broke every service_role Edge
-- Function: ensure-player returned `permission denied for table players`
-- on its first SELECT. service_role is the trusted backend role that
-- bypasses RLS and is the ONLY writer of these tables, so it must hold full
-- DML. authenticated had also lost SELECT, which the frontend needs to read
-- the player's own row -- RLS (enabled on all three) still restricts row
-- visibility to the owner, so this grant does not widen what a client can see
-- beyond its own rows.
--
-- GRANT is idempotent, so re-applying this migration is harmless.

grant select, insert, update, delete
  on public.players, public.player_stats, public.earnings_log
  to service_role;

grant select
  on public.players, public.player_stats, public.earnings_log
  to authenticated;
