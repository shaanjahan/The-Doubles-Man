// Fire-and-forget attribution for the /app smart link: records {src, platform}
// plus the user agent into link_hits. No player data involved; failures are
// invisible to the visitor (the redirect proceeds regardless).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { serveWithCors } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serveWithCors(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const src = String(body?.src || 'direct').slice(0, 40);
    const platform = String(body?.platform || 'unknown').slice(0, 20);
    const ua = (req.headers.get('user-agent') || '').slice(0, 300);
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await admin.from('link_hits').insert({ src, platform, user_agent: ua });
    return Response.json({ ok: true });
  } catch (_e) {
    return Response.json({ ok: false });
  }
});
