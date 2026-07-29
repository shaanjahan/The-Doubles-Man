// supabase/functions/delete-account/index.ts
//
// Authoritative in-app account deletion (Apple 5.1.1(v)). Supabase port of the
// Base44 delete-account. The outcome is decided ONLY by deleting the auth
// account; game data is removed and purchases are RETAINED (de-identified) for
// tax/accounting.
//
// We rely on FK cascades (verified): deleting the auth user cascades
//   players -> player_stats, earnings_log   (ON DELETE CASCADE)
//   leaderboard_entries                     (ON DELETE CASCADE)
// and de-identifies+retains
//   purchases.owner_id -> NULL              (ON DELETE SET NULL)
// all atomically in one deleteUser call. Success -> ok:true (the account is
// gone); failure of the user delete -> ok:false 500.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function countFor(admin: any, table: string, col: string, uid: string): Promise<number> {
  const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(col, uid);
  return count ?? 0;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace('Bearer ', '');
    if (!jwt) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Counts before deletion (informational, best-effort).
    const counts = { players_deleted: 0, purchases_deidentified: 0, leaderboard_deleted: 0 };
    try {
      counts.players_deleted = await countFor(admin, 'players', 'user_id', user.id);
      counts.purchases_deidentified = await countFor(admin, 'purchases', 'owner_id', user.id);
      counts.leaderboard_deleted = await countFor(admin, 'leaderboard_entries', 'owner_id', user.id);
    } catch (_e) { /* counts are best-effort; deletion is the decisive step */ }

    // The decisive step (Apple): delete the auth account. Cascades remove game
    // data + leaderboard rows; purchases owner_id -> NULL (retained).
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return Response.json(
        { ok: false, error: 'Account deletion failed: ' + delErr.message, counts },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, counts });
  } catch (error) {
    console.error('delete-account error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
});
