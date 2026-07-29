import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authoritative account deletion (Apple 5.1.1(v)).
//
// Outcome is decided ONLY by User.delete (the auth account itself):
//   - User.delete succeeds → 200 { ok: true, counts, warnings }
//     The account IS gone; cleanup steps that failed are listed in warnings
//     but the user must NOT be told to retry.
//   - User.delete fails    → 500 { ok: false, error, counts, warnings }
//
// counts reports how many records each step actually touched:
//   { players_deleted, purchases_deidentified }
//
// PurchaseOrder records are NOT deleted — they're retained for tax/accounting
// (per our Privacy Policy + /delete-account page) and de-identified by
// blanking the email field. product, amount, date, transaction ID, checkout
// ID are all preserved.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const counts = { players_deleted: 0, purchases_deidentified: 0, leaderboard_deleted: 0 };
    const warnings = [];

    // 1. Delete the player's game progress.
    try {
      const res = await base44.asServiceRole.entities.Player
        .deleteMany({ created_by_id: user.id });
      counts.players_deleted = res?.deleted ?? 0;
    } catch (e) {
      console.error('Player delete failed:', e);
      warnings.push('player_delete_failed: ' + (e?.message || String(e)));
    }

    // 2. De-identify purchase records. Filter on BOTH linking fields
    //    (created_by_id is auto-stamped on create and confirmed populated by
    //    the webhook; email is explicitly written) and dedupe by id so a row
    //    caught by both isn't updated twice. Blank the email with a plain
    //    update() object — guaranteed, and gives an exact touched count.
    try {
      const byCreator = await base44.asServiceRole.entities.PurchaseOrder
        .filter({ created_by_id: user.id });
      const byEmail = user.email
        ? await base44.asServiceRole.entities.PurchaseOrder.filter({ email: user.email })
        : [];
      const seen = new Set();
      const orders = [];
      for (const o of [...byCreator, ...byEmail]) {
        if (o?.id && !seen.has(o.id)) { seen.add(o.id); orders.push(o); }
      }
      for (const o of orders) {
        await base44.asServiceRole.entities.PurchaseOrder.update(o.id, { email: '' });
      }
      counts.purchases_deidentified = orders.length;
    } catch (e) {
      console.error('PurchaseOrder de-identify failed:', e);
      warnings.push('purchase_deidentify_failed: ' + (e?.message || String(e)));
    }

    // 2.5. Remove the player's leaderboard rows so deleted accounts don't
    //      linger as ghost entries on the public boards.
    try {
      const lb = await base44.asServiceRole.entities.LeaderboardEntry
        .deleteMany({ ownerId: user.id });
      counts.leaderboard_deleted = lb?.deleted ?? 0;
    } catch (e) {
      console.error('Leaderboard delete failed:', e);
      warnings.push('leaderboard_delete_failed: ' + (e?.message || String(e)));
    }

    // 3. Delete the auth account itself — the decisive step for Apple.
    try {
      await base44.asServiceRole.entities.User.delete(user.id);
    } catch (e) {
      console.error('User delete failed:', e);
      return Response.json(
        {
          ok: false,
          error: 'Account deletion failed: ' + (e?.message || String(e)),
          counts,
          warnings,
        },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, counts, warnings });
  } catch (error) {
    console.error('delete-account error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});