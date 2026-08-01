// supabase/functions/ensure-player/index.ts
//
// Atomic "create Player row if missing" — replaces the old Base44
// client-side `list → create if empty` pattern that could race under
// double-mount or two tabs and create duplicate rows (audit issue #3).
//
// Runs as service_role so it can insert past RLS — `players` has no
// INSERT policy for `authenticated`, so this function is the ONLY path
// a player row can ever be created through.
//
// The `players_user_id_unique` constraint is the real backstop: if two
// requests for the same user land at the same instant, Postgres itself
// rejects the second insert (error 23505) rather than silently creating
// a duplicate. We catch that specific case and just return the row the
// other request created.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// snake_case DB row -> camelCase (top-level keys only), matching the player
// contract every other function returns (finalize-round / manage-business / …).
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
function camelizeKeys(row: Record<string, any> | null): Record<string, any> {
  const out: Record<string, any> = {};
  if (!row) return out;
  for (const k of Object.keys(row)) out[toCamel(k)] = row[k];
  return out;
}

// Ensure the stats row exists, then return the player in the client contract:
// camelCase + nested camelCase `stats` (so reload() has full state on load, not
// zeroed stats).
async function respondWithPlayer(
  admin: any,
  playerRow: Record<string, any>,
  created: boolean,
  user: { id: string; email?: string | null },
) {
  const stats = await ensureStatsRow(admin, playerRow.id);
  // Apply this tester's migrated historical leaderboard standings (best-effort,
  // never fatal to player load — mirrors finalize-round's non-fatal leaderboard
  // write). Fires on every ensure but is a no-op once seeded_at is stamped.
  await applyLeaderboardSeed(admin, user, playerRow).catch((e) =>
    console.error('leaderboard seed apply error:', e instanceof Error ? e.message : String(e))
  );
  const player = { ...camelizeKeys(playerRow), stats: camelizeKeys(stats) };
  return Response.json({ player, created });
}

// One-time: if this tester has a leaderboard_seed row not yet applied, write
// their historical bests via leaderboard_upsert_best (only-if-greater, so it
// never lowers a live score) and stamp seeded_at so it applies exactly once.
// Double-apply across tabs is harmless (idempotent RPC), so we don't lock.
async function applyLeaderboardSeed(
  admin: any,
  user: { id: string; email?: string | null },
  playerRow: Record<string, any>,
) {
  const email = (user.email ?? '').toLowerCase();
  if (!email) return;
  const { data: seed } = await admin
    .from('leaderboard_seed')
    .select('*')
    .eq('email', email)
    .is('seeded_at', null)
    .maybeSingle();
  if (!seed) return;
  const { error } = await admin.rpc('leaderboard_upsert_best', {
    p_owner_id: user.id,
    p_display_name: seed.display_name,
    p_avatar_emoji: playerRow.avatar_emoji ?? seed.avatar_emoji ?? null,
    p_location_id: seed.location_id,
    p_business_tier: seed.business_tier,
    p_level: seed.level,
    p_vip: seed.vip,
    p_round_score: seed.round_score,
    p_customers: seed.customers_served,
    p_max_combo: seed.max_combo,
    // Historical Base44 bests belong on the all-time board only — they must
    // never top a daily/weekly/monthly board the player didn't earn today.
    p_all_periods: false,
  });
  if (error) { console.error('leaderboard_upsert_best (seed) error:', error.message); return; }
  await admin.from('leaderboard_seed').update({ seeded_at: new Date().toISOString() }).eq('email', email);
}

serveWithCors(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Confirm identity against the caller's own JWT.
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // service_role client — bypasses RLS. The only writer of `players` rows.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Row already exists?
    const { data: existing, error: selErr } = await admin
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (selErr) throw selErr;

    if (existing) {
      return await respondWithPlayer(admin, existing, false, user);
    }

    // 2. Try to create one.
    const { data: created, error: insErr } = await admin
      .from('players')
      .insert({ user_id: user.id })
      .select()
      .single();

    if (insErr) {
      // 23505 = unique_violation — another request won the race. Not a
      // failure; fetch and return the row it created.
      if (insErr.code === '23505') {
        const { data: raceWinner, error: refetchErr } = await admin
          .from('players')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (refetchErr) throw refetchErr;
        if (raceWinner) {
          return await respondWithPlayer(admin, raceWinner, false, user);
        }
      }
      throw insErr;
    }

    return await respondWithPlayer(admin, created, true, user);
  } catch (error) {
    console.error('ensure-player error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});

// Every player needs a matching player_stats row for finalize-round to
// update. Idempotent — safe to call even if the row already exists. Returns the
// stats row (so the response can nest it as camelCase `stats`).
async function ensureStatsRow(
  admin: any,
  playerId: string,
): Promise<Record<string, any> | null> {
  const { data, error } = await admin
    .from('player_stats')
    .insert({ player_id: playerId })
    .select()
    .maybeSingle();
  if (!error && data) return data;
  // 23505 here just means the stats row already exists — fine, read it back.
  if (error && error.code !== '23505') {
    console.error('ensureStatsRow error:', error);
  }
  const { data: existing } = await admin
    .from('player_stats').select('*').eq('player_id', playerId).maybeSingle();
  return existing ?? null;
}
