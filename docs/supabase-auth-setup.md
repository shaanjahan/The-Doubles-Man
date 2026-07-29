# Supabase auth config — exact dashboard steps

Manual dashboard configuration required for the frontend cutover (readiness
item #4, sub-step 3e). None of this is code; it's Supabase + Google + Apple
console setup. Do it before the local auth end-to-end test can pass.

- **Project ref:** `zongwrqawgaipabdgmwe`
- **Supabase OAuth callback** (used everywhere below):
  `https://zongwrqawgaipabdgmwe.supabase.co/auth/v1/callback`
- **App bundle id:** `com.base6a5fd3358a1c9fbb7f503fd5.app`
- **Dev URL:** `http://localhost:5173` (Vite default) · **Prod:** `https://thedoublesman.com`

---

## 1. Email OTP templates (send a 6-digit code, not a magic link)

The app's register/login uses **OTP codes** (`verifyOtp` with a typed code), so
the emails must contain `{{ .Token }}`, not `{{ .ConfirmationURL }}`.

**Dashboard → Authentication → Email Templates.** For each template, replace the
confirmation-link line with the code:

- **Confirm signup** (register): `Your verification code is: {{ .Token }}`
- **Magic Link** (OTP login): `Your login code is: {{ .Token }}`
- **Reset Password** (recovery): `Your password reset code is: {{ .Token }}`

**Dashboard → Authentication → Providers → Email:** ensure **"Confirm email"** is
ON; leave **OTP length = 6** (the UI expects 6 digits), OTP expiry default (3600s).

## 2. Redirect URL allow-list

**Dashboard → Authentication → URL Configuration:**

- **Site URL:** `https://thedoublesman.com`
- **Redirect URLs** (add all):
  - `http://localhost:5173` and `http://localhost:5173/**`
  - `https://thedoublesman.com/**`

## 3. OAuth providers

### Google

1. **Google Cloud Console → APIs & Services → Credentials → Create OAuth client
   ID → Web application.**
2. **Authorized redirect URI:**
   `https://zongwrqawgaipabdgmwe.supabase.co/auth/v1/callback`
3. Copy **Client ID** + **Client Secret**.
4. **Supabase → Authentication → Providers → Google → enable**, paste Client ID
   + Secret, Save.

### Apple (expect back-and-forth — this is the long pole)

In the **Apple Developer** portal (Certificates, Identifiers & Profiles):

1. **App ID** — open the app identifier (`com.base6a5fd3358a1c9fbb7f503fd5.app`),
   enable the **Sign in with Apple** capability if not already.
2. **Services ID** (becomes the OAuth **client_id** for web): Identifiers → **+**
   → **Services IDs**, id like `com.thedoublesman.web`. Enable **Sign in with
   Apple** → **Configure**:
   - **Primary App ID:** the app's App ID above.
   - **Domains and Subdomains:** `zongwrqawgaipabdgmwe.supabase.co`
   - **Return URLs:** `https://zongwrqawgaipabdgmwe.supabase.co/auth/v1/callback`
3. **Sign in with Apple Key:** Keys → **+** → enable **Sign in with Apple**,
   associate with the App ID → **download the `.p8`** (one-time). Note the
   **Key ID** and your **Team ID**.
4. **Supabase → Authentication → Providers → Apple → enable:**
   - **Client IDs:** the **Services ID** (`com.thedoublesman.web`) **and** the app
     bundle id `com.base6a5fd3358a1c9fbb7f503fd5.app`, comma-separated (bundle id
     covers native Sign in with Apple).
   - **Secret Key:** paste the **`.p8`** contents + **Team ID** + **Key ID**
     (Supabase generates the client-secret JWT), or paste a pre-generated secret.

**Apple gotchas:**

- The client-secret JWT **expires (max 6 months)** — regenerate periodically, or
  let Supabase manage it via the `.p8`.
- Domain association can take minutes to propagate; `invalid_client` usually
  means the Services ID Return URL or Client IDs don't exactly match.
- The app runs in a **WKWebView**, so Apple sign-in uses the **web** OAuth flow
  (Services ID). That works; if Apple later requires *native* ASAuthorization in
  the wrapper, that's a native-build change — flag if it comes up.

---

**Apple compliance:** Google sign-in is offered, so **Sign in with Apple is
mandatory** (App Store guideline 4.8). The app already has both — keep them wired.
