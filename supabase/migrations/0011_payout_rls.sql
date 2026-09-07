-- ============================================================================
-- 0011_payout_rls.sql
--
-- Security model recap:
--   - payout_accounts / payout_verifications: DENY-ALL, zero policies, exactly
--     like organization_credentials (0009). A bank account number is at
--     least as sensitive as an API secret - not even the organization's own
--     owner reads the raw row via the normal client. All access goes through
--     server actions that authorize first (requireOrgRole owner-only), then
--     use the service-role client. Read access for the UI is via a status
--     function returning {configured, last4, verificationStatus, bankName} -
--     never the account number - built in a later phase.
--   - payout_requests / payout_transactions: real money movement, but no raw
--     bank details - normal tenant SELECT (org members + platform_admin),
--     INSERT/UPDATE restricted to platform_admin only (both via RLS here AND
--     via requirePlatformAdmin() in the server action - defense in depth,
--     consistent with the rest of this codebase).
--   - payout_reconciliations: SELECT for org members/platform_admin; NO
--     insert policy - only the reconciliation cron (service role) writes.
--   - payout_audit_logs: SELECT for org members/platform_admin; NO
--     insert/update/delete policy at all, ever - forging an audit entry from
--     the client must be impossible. Writes happen exclusively via service
--     role as a side effect of other trusted server-side code.
-- ============================================================================

alter table payout_accounts enable row level security;
alter table payout_verifications enable row level security;
-- Intentionally no policies on either table: default-deny for every role
-- except service_role.

alter table payout_requests enable row level security;

create policy payout_requests_select on payout_requests for select
  using (is_platform_admin() or is_org_member(organization_id));

create policy payout_requests_insert on payout_requests for insert
  with check (is_platform_admin());

create policy payout_requests_update on payout_requests for update
  using (is_platform_admin());

alter table payout_transactions enable row level security;

create policy payout_transactions_select on payout_transactions for select
  using (is_platform_admin() or is_org_member(organization_id));

create policy payout_transactions_insert on payout_transactions for insert
  with check (is_platform_admin());

create policy payout_transactions_update on payout_transactions for update
  using (is_platform_admin());

alter table payout_reconciliations enable row level security;

create policy payout_reconciliations_select on payout_reconciliations for select
  using (is_platform_admin() or is_org_member(organization_id));
-- No insert/update/delete policy - only service role (the reconciliation cron) writes.

alter table payout_audit_logs enable row level security;

create policy payout_audit_logs_select on payout_audit_logs for select
  using (is_platform_admin() or is_org_member(organization_id));
-- No insert/update/delete policy at all - append-only via service role only.

-- ----------------------------------------------------------------------------
-- Extend organization_credentials to also hold Zoom / Google Meet
-- credentials (Phase 22/23) - purely additive, same locked-down table and
-- RLS from 0009, no security model change needed.
-- ----------------------------------------------------------------------------
alter table organization_credentials drop constraint organization_credentials_provider_check;
alter table organization_credentials add constraint organization_credentials_provider_check
  check (provider in ('msg91', 'cashfree', 'email', 'cashfree_payouts', 'zoom', 'google_meet'));
