# Deployment Guide

This app deploys as: **Next.js on Vercel** + **Supabase** (Postgres, Auth, RLS)
+ **Cashfree** (payments) + **MSG91** (SMS/WhatsApp) + **Resend** (email).

---

## 1. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. From **Project Settings -> API**, note:
   - Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key -> `SUPABASE_SERVICE_ROLE_KEY` (never expose this to the browser - it's read only by server-side code in this app, e.g. `lib/supabase/admin.ts`)
3. From **Project Settings -> Database**, note the connection string (you'll need it for the migration step below). Use the direct/session connection, not the transaction pooler - some migrations use multi-statement `DO` blocks that need a session-level connection.

## 2. Apply database migrations

All real migrations live in `supabase/migrations/`, numbered `0000`-`0009`.
**`0000_supabase_auth_stub.sql` is local-development-only** - it recreates a
minimal `auth` schema and the `anon`/`authenticated`/`service_role` Postgres
roles so migrations can be tested against a plain Postgres instance without
Supabase. A real Supabase project already provides all of this - **do not run
`0000` against Supabase.**

Two ways to apply the rest (`0001`-`0009`):

### Option A: convenience script

```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" ./scripts/apply-migrations.sh
```

This applies every file in `supabase/migrations/` in order and automatically
skips `0000`. Verified against a real Postgres connection (see the script's
own comments for details on what it does and doesn't touch).

### Option B: Supabase SQL Editor

Open each `000N_*.sql` file (skip `0000`) in order and run its contents in
the Supabase Dashboard's SQL Editor, one at a time, in numeric order.

### What NOT to run

- `supabase/migrations/0000_supabase_auth_stub.sql` - local dev only.
- Anything under `supabase/dev-tests/` - these are throwaway verification
  scripts used during development (RLS isolation checks, dedupe-key tests,
  webhook idempotency tests, etc.), not migrations. See that folder's
  `README.md`. Each one inserts and then deletes its own fixture data, but
  they were never intended to run against a real project.
- `supabase/seed/demo-ias-academy.sql` - optional demo data, see step 7.

### Verify

After applying, confirm all 15 tables exist:

```sql
select tablename from pg_tables where schemaname = 'public' order by tablename;
-- expect: attendance, automation_rules, campaigns, form_fields, forms,
-- message_logs, message_templates, organization_credentials,
-- organization_members, organizations, payments, platform_admins,
-- registration_values, registrations, webinars
```

## 3. Confirm Row Level Security

Every tenant table has RLS enabled by `0002_rls_policies.sql`. Sanity-check
in the SQL Editor:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and rowsecurity = false;
-- expect: 0 rows (every table should have RLS enabled)
```

If you want to re-verify tenant isolation itself (not just that RLS is
*enabled*), the pattern used during development is in
`supabase/dev-tests/rls_isolation_test.sql` - read it before running
anything, and never run it against real tenant data.

## 4. Configure Supabase Auth

- **Authentication -> Providers -> Email**: enabled by default. Decide
  whether to require email confirmation (Settings -> "Confirm email"). If
  you disable it, users get a session immediately on signup, matching the
  simplest flow this app assumes; if you enable it, `app/signup/actions.ts`
  already handles the "check your email" case.
- **Authentication -> URL Configuration**: set the Site URL to your
  production domain, and add it (plus any preview deployment domains) to
  Redirect URLs.

## 5. Bootstrap the first platform admin

There's no UI for this by design - platform admin status is not something
any tenant user can grant themselves. After your own account signs up:

```sql
insert into platform_admins (user_id)
values ('<your-auth-user-id-from-auth.users>');
```

Find your user id in **Authentication -> Users** in the Supabase dashboard.

## 6. Environment variables

Copy `.env.local.example` to `.env.local` for local development, and set the
same variables in **Vercel -> Project Settings -> Environment Variables**
for each environment (Production/Preview/Development) you use.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From step 1 - safe to expose to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From step 1 - **server-only, never expose this** |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployed URL, e.g. `https://youracademy.vercel.app` - used to build public form links, Cashfree return/notify URLs, and webhook URLs |
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` / `CASHFREE_ENV` / `CASHFREE_WEBHOOK_SECRET` | Platform default | Platform-level fallback only - see step 8. Individual tenants can (and for production, should) configure their own via **Settings** in the app (Phase 13), which takes priority. |
| `MSG91_AUTH_KEY` / `MSG91_SENDER_ID` / `MSG91_WHATSAPP_INTEGRATED_NUMBER` | Platform default | Same fallback relationship as Cashfree - a tenant's own Settings values take priority. |
| `EMAIL_PROVIDER_API_KEY` / `EMAIL_FROM_ADDRESS` | Platform default | Resend API key + verified sender. Same fallback relationship. |
| `CRON_SECRET` | Yes | Random string (16+ chars) - Vercel automatically sends this as the cron job's `Authorization: Bearer` header once set as an env var; see step 9. |

Generate `CRON_SECRET` with:

```bash
openssl rand -base64 32
```

## 7. (Optional) Seed demo data

To populate a "Demo IAS Academy" tenant with 2 webinars, 3 forms, 20
registrations, payments, message logs, and attendance history:

```bash
DATABASE_URL="postgresql://..." psql "$DATABASE_URL" -f supabase/seed/demo-ias-academy.sql
```

Safe to re-run (it clears and re-inserts only its own fixed demo
organization, never touching other tenants - verified during development).
To make it loggable-into, create a real Supabase Auth user and link them:

```sql
insert into organization_members (organization_id, user_id, role)
values ('00000000-0000-0000-0000-0000000000d1', '<your-auth-user-id>', 'organization_owner');
```

## 8. Cashfree configuration

Cashfree credentials can be set at the **platform level** (env vars above,
used as a fallback) or per-tenant (recommended for production - each
academy/institute brings its own Cashfree account, isolating their own
payment volume and compliance). Per-tenant credentials are set from
**Settings** inside the app and are stored in the locked-down
`organization_credentials` table (RLS denies all client access - only
server-side code with the service-role key can read them back).

For each Cashfree account you connect (platform or per-tenant):

1. Get the App ID and Secret Key from the Cashfree dashboard (sandbox or
   production, matching what you configure).
2. **Webhook URL**: in the Cashfree dashboard, set the webhook/notify URL to:
   ```
   https://<your-domain>/api/webhooks/cashfree
   ```
   Subscribe to payment status events (success/failed/user dropped).
3. **Webhook secret**: Cashfree gives you a secret used to sign webhook
   payloads - this is what `CASHFREE_WEBHOOK_SECRET` (or the per-tenant
   equivalent) verifies against. Getting this wrong means every webhook gets
   rejected with 401 - if payments aren't confirming, check this first.
4. This app was built and its signature-verification logic tested against
   Cashfree's Orders API `2023-08-01` and their documented
   `HMAC-SHA256(timestamp + raw_body, secret)` webhook signature scheme
   (verified with a synthetic signed payload during development - see
   `lib/payments/cashfree.ts`). It has **not** been exercised against a real
   Cashfree sandbox transaction from this environment (no network access to
   cashfree.com during development) - run one real sandbox payment end-to-end
   before going live.

## 9. Vercel Cron (automation reminders)

`vercel.json` already defines a cron job hitting `/api/cron/automation-tick`
every 5 minutes. Once deployed to Vercel with `CRON_SECRET` set as an env
var, Vercel automatically signs each cron request with that secret as the
`Authorization: Bearer` header - no extra wiring needed. Confirm it's
running: **Vercel Dashboard -> your project -> Cron Jobs**.

To test manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/automation-tick
```

## 10. MSG91 configuration

SMS and WhatsApp both require **pre-approved templates** (India's DLT
regulation for SMS; Meta's template approval for WhatsApp Business) - this
app cannot send arbitrary free-text messages through either channel. For
each message template created in **Messages** inside the app:

- For SMS: register the template with MSG91 (DLT-compliant), then enter its
  MSG91 template ID in that template's "MSG91 template id" field.
- For WhatsApp: register and get the template approved via MSG91's WhatsApp
  Business integration, then enter the approved template name.
- Until a template has this provider ID configured, sends for that
  key/channel will fail cleanly and log a specific reason
  (`message_logs.failure_reason`) - this is expected, not a bug, for any
  template you haven't registered with the provider yet.

## 11. Email configuration

Default provider is [Resend](https://resend.com). Verify your sending
domain there, then set `EMAIL_PROVIDER_API_KEY` and `EMAIL_FROM_ADDRESS`
(platform-level) and/or configure per-tenant in Settings.

## 11a. Zoom attendance sync (per-tenant)

Each organization creates their own free Server-to-Server OAuth app in the
[Zoom App Marketplace](https://marketplace.zoom.us) (Build App -> Server-to-Server
OAuth), enables the `report:read:admin` scope, and enters the resulting
Account ID / Client ID / Client Secret in **Settings** (provider stored as
`zoom` in `organization_credentials`). No platform-level Zoom app is needed.

## 11b. Google Meet attendance sync (platform-level OAuth app)

Unlike Zoom, Google Meet uses **one platform-level OAuth app** that every
tenant connects their own Google account to (a per-tenant Google Cloud
project would be unreasonable friction).

1. Create a project in [Google Cloud Console](https://console.cloud.google.com),
   enable the **Google Meet API**.
2. Configure the OAuth consent screen. Note: the `admin.directory.user.readonly`
   scope this app requests is a **restricted scope** - Google requires an
   app verification/security assessment before you can use it with more
   than ~100 users in production. Until verified, only test users you
   explicitly add to the OAuth consent screen can complete the flow.
3. Create OAuth 2.0 credentials (Web application). Add
   `https://<your-domain>/api/integrations/google-meet/callback` as an
   authorized redirect URI.
4. Set `GOOGLE_MEET_CLIENT_ID`, `GOOGLE_MEET_CLIENT_SECRET`, and
   `GOOGLE_MEET_REDIRECT_URI` (matching step 3 exactly) as env vars.
5. Set `GOOGLE_OAUTH_STATE_SECRET` (`openssl rand -base64 32`) - this signs
   the CSRF-protection state parameter used during the connect/callback
   flow; unrelated to anything Google issues.

**Important limitation, not a bug to "fix" later without a bigger integration:**
reliably resolving a *signed-in* Meet participant's email requires the
**connected Google account itself to have Workspace admin directory read
access**. A personal Gmail account, or a non-admin Workspace user, cannot
resolve other participants' emails no matter what scope is requested -
Google simply rejects the Directory API call for them. In that case, sync
still runs successfully but most signed-in participants (and all anonymous
guests, always) come back unmatched, visible honestly in each webinar's
sync log rather than silently failing. Full, universal resolution needs a
Workspace admin to grant a service account **domain-wide delegation** - a
separate, larger integration this app does not attempt.

## 12. Deploy to Vercel

1. Push this repository to GitHub/GitLab/Bitbucket and import it in Vercel,
   or run `vercel` from the project root.
2. Set all environment variables from step 6 in the Vercel project.
3. Deploy. Vercel will automatically pick up `vercel.json`'s cron
   configuration.
4. After the first deploy, run through steps 5 (bootstrap platform admin)
   and, optionally, 7 (seed demo data) against the deployed Supabase project.

## 13. Production go-live checklist

Before pointing real traffic at this:

- [ ] All 9 real migrations applied (step 2), RLS confirmed enabled on every
      table (step 3).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only in Vercel's server environment,
      never referenced with `NEXT_PUBLIC_` prefix, never logged.
- [ ] At least one platform admin bootstrapped (step 5).
- [ ] Cashfree webhook URL configured and **one real sandbox (or production)
      payment run end-to-end**, confirming the webhook actually lands and
      confirms a registration (this is the one thing that could not be
      exercised in the development environment - see step 8).
- [ ] At least one MSG91 SMS/WhatsApp template actually registered and
      tested with a real send, if you plan to use those channels.
- [ ] Resend domain verified and a real test email sent.
- [ ] Vercel Cron job visible and firing (step 9).
- [ ] `CRON_SECRET` is a real random value, not left blank (a blank/missing
      secret means the cron endpoint always returns 401 and rejects even
      Vercel's own calls - reminders silently never fire).
