// Auth-contract guard for The Doubles Man.
//
// The app hard-depends on several live Supabase auth settings (six OTP input
// slots, email-code flow, custom SMTP, Apple sign-in). Those settings live in
// the dashboard/config API where they can drift silently — a real user found
// mailer_otp_length=8 vs the app's 6 slots the hard way (signup dead-end,
// 2026-08-01). This script asserts the whole contract, INCLUDING minting a
// real signup OTP for a throwaway account and checking its actual length,
// then deleting the throwaway.
//
//   set -a; source .env; set +a
//   deno run --allow-net --allow-env scripts/check-auth-config.ts
//
// Run after ANY auth/dashboard change and before onboarding new testers.
// Exits 1 if any check fails.

const PAT = Deno.env.get('SUPABASE_PAT');
const SROLE = Deno.env.get('SROLE');
if (!PAT || !SROLE) throw new Error('SUPABASE_PAT and SROLE required — run: set -a; source .env; set +a');

const REF = 'zongwrqawgaipabdgmwe';
const URL = `https://${REF}.supabase.co`;

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
};

// ---- 1. Config assertions (Management API) ----
const cfg = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/config/auth`, {
  headers: { Authorization: `Bearer ${PAT}`, 'User-Agent': 'Mozilla/5.0' },
})).json();

console.log('Auth config:');
check('OTP length is 6 (app renders six input slots)', cfg.mailer_otp_length === 6, `got ${cfg.mailer_otp_length}`);
check('autoconfirm OFF (app expects email codes)', cfg.mailer_autoconfirm === false, String(cfg.mailer_autoconfirm));
check('custom SMTP set (built-in mailer is ~2/hr)', cfg.smtp_host === 'smtp.resend.com', `host=${cfg.smtp_host}`);
check('sender on the verified domain', (cfg.smtp_admin_email || '').endsWith('@thedoublesman.com'), String(cfg.smtp_admin_email));
check('Apple sign-in enabled', cfg.external_apple_enabled === true);
check('site_url is production', cfg.site_url === 'https://thedoublesman.com', String(cfg.site_url));

// ---- 2. Live canary: mint a real signup OTP, assert its true length ----
console.log('Live OTP canary:');
const email = `otp-canary+${Date.now()}@example.com`;
const res = await fetch(`${URL}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'signup', email, password: crypto.randomUUID() }),
});
const j = await res.json();
const otp = j?.email_otp ?? j?.properties?.email_otp ?? '';
check('freshly minted signup code is exactly 6 digits', /^\d{6}$/.test(otp), otp ? `${otp.length} chars` : `no email_otp in response (${JSON.stringify(j).slice(0, 90)})`);

const uid = j?.user?.id ?? j?.id;
if (uid) {
  await fetch(`${URL}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: { apikey: SROLE, Authorization: `Bearer ${SROLE}` },
  });
  console.log('  (canary account deleted)');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED — fix before onboarding anyone.` : '\nAll auth-contract checks passed.');
if (failed) Deno.exit(1);
