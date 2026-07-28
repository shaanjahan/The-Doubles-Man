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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
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
      await ensureStatsRow(admin, existing.id);
      return Response.json({ player: existing, created: false });
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
          await ensureStatsRow(admin, raceWinner.id);
          return Response.json({ player: raceWinner, created: false });
        }
      }
      throw insErr;
    }

    await ensureStatsRow(admin, created.id);
    return Response.json({ player: created, created: true });
  } catch (error) {
    console.error('ensure-player error:', error);
    return Response.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
});

// Every player needs a matching player_stats row for finalize-round to
// update. Idempotent — safe to call even if the row already exists.
async function ensureStatsRow(admin: ReturnType<typeof createClient>, playerId: string) {
  const { error } = await admin
    .from('player_stats')
    .insert({ player_id: playerId })
    .select()
    .maybeSingle();
  // 23505 here just means the stats row already exists — fine, ignore.
  if (error && error.code !== '23505') {
    console.error('ensureStatsRow error:', error);
  }
}
