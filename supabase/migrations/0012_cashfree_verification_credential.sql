-- ============================================================================
-- 0012_cashfree_verification_credential.sql
--
-- Cashfree Bank Account Verification lives on a genuinely separate product
-- (the "Verification Suite", host api.cashfree.com/verification) with its
-- own x-client-id/x-client-secret pair - distinct from both Payments
-- (/pg) and Payouts (/payout). Modeling it as its own credential bucket
-- (rather than cramming it into 'cashfree_payouts') avoids needing a
-- read-then-merge on every credentials save and matches how Cashfree
-- actually issues these keys.
-- ============================================================================

alter table organization_credentials drop constraint organization_credentials_provider_check;
alter table organization_credentials add constraint organization_credentials_provider_check
  check (provider in ('msg91', 'cashfree', 'email', 'cashfree_payouts', 'cashfree_verification', 'zoom', 'google_meet'));
