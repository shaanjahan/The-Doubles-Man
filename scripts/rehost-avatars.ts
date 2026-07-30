// One-time rehost of tester avatars off the Base44 CDN into Supabase Storage,
// so restored testers don't end up with dead media.base44.com links once Base44
// is cancelled. RUN THIS WHILE BASE44 IS STILL LIVE (the source images must be
// reachable). Dry-run by default; pass --apply to upload.
//
//   set -a; source .env; set +a        # loads SROLE + PLAYER_CSV
//   deno run --allow-net --allow-read --allow-env scripts/rehost-avatars.ts [--apply]
//
// Keyed by Base44 `created_by_id` (stable, available for all 8 testers whether
// or not they've signed into the new app yet) -> Storage object avatars/<id>.png.
// Idempotent: re-running re-uploads to the same deterministic path (upsert).
// seed-testers.ts derives the same path, so restore needs no network for avatars.

import { parse } from 'jsr:@std/csv@1/parse';
import { createClient } from 'npm:@supabase/supabase-js@2';

const REF = 'zongwrqawgaipabdgmwe';
const URL = `https://${REF}.supabase.co`;
const SROLE = Deno.env.get('SROLE');
const PLAYER_CSV = Deno.env.get('PLAYER_CSV') ?? 'Player_export.csv';
if (!SROLE) throw new Error('SROLE (project service_role) not set — run: set -a; source .env; set +a');
const APPLY = Deno.args.includes('--apply');
const admin = createClient(URL, SROLE, { auth: { persistSession: false } });

const int = (v: unknown) => Math.trunc(Number(v ?? 0) || 0);
const roundsOf = (r: Record<string, string>) => {
  try { return int(JSON.parse(r['stats'] || '{}').roundsPlayed); } catch { return 0; }
};

// Dedup Player export to most-progressed row per created_by_id (>=3 rounds).
const players = parse(await Deno.readTextFile(PLAYER_CSV), { skipFirstRow: true }) as Record<string, string>[];
const score = (r: Record<string, string>) => int(r['level']) * 1e12 + roundsOf(r) * 1e6 + int(r['coins']);
const best: Record<string, Record<string, string>> = {};
for (const r of players) {
  const c = r['created_by_id'];
  if (!c) continue;
  if (!best[c] || score(r) > score(best[c])) best[c] = r;
}
const targets = Object.entries(best).filter(([, r]) => roundsOf(r) >= 3);
console.log(`${targets.length} testers; ${APPLY ? '*** APPLY — uploading ***' : '--- DRY RUN (no uploads) ---'}\n`);

let done = 0, skipped = 0, failed = 0;
for (const [cbid, r] of targets) {
  const src = (r['avatarEmoji'] || '').trim();
  const name = r['displayName'] || '(unnamed)';
  if (!src.includes('base44.com')) { console.log(`  SKIP (not a Base44 URL): ${name}`); skipped++; continue; }
  const path = `${cbid}.png`;
  const publicUrl = `${URL}/storage/v1/object/public/avatars/${path}`;
  if (!APPLY) { console.log(`  WOULD REHOST: ${name}  ${src.slice(0, 60)}… -> avatars/${path}`); done++; continue; }
  try {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`source ${resp.status}`);
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const { error } = await admin.storage.from('avatars').upload(path, bytes, {
      contentType: resp.headers.get('content-type') || 'image/png',
      upsert: true,
    });
    if (error) throw error;
    console.log(`  REHOSTED: ${name}  -> ${publicUrl}`);
    done++;
  } catch (e) {
    console.log(`  FAILED: ${name}  ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}
console.log(`\nSummary: ${APPLY ? 'rehosted' : 'would rehost'} ${done} | skipped ${skipped} | failed ${failed}`);
