// Shared CORS handling for all Edge Functions. The frontend calls these from a
// browser origin (localhost during dev, thedoublesman.com in prod), so each
// function must answer the preflight OPTIONS and echo CORS headers on every
// response — otherwise the browser blocks the call with "Failed to fetch"
// (server-to-server tests never hit this, only real browsers do).

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// Wrap a handler: short-circuit the OPTIONS preflight, and merge CORS headers
// into whatever Response the handler returns (success or error).
export function serveWithCors(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }
    const res = await handler(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  });
}
