-- ============================================================================
-- 0010_payout_schema.sql
--
-- V1 PAYOUT/BANK-VERIFICATION SCOPE ONLY. This is deliberately NOT full
-- KYC/KYB: no Aadhaar, PAN, GST, business KYB, video KYC, document upload, or
-- manual KYC approval. "Bank Verification" / "Payout Verification" here means
-- exactly: bank account collection, Cashfree Bank Account Verification
-- (name-match + IFSC validation), a verification status, and payout
-- eligibility gated on that status. Do not extend this schema to imply a
-- completed KYC/KYB process without an explicit, separate scope decision.
-- ============================================================================

create type bank_verification_status as enum
  ('NOT_VERIFIED', 'PENDING', 'VERIFIED', 'NAME_MISMATCH', 'FAILED');

create type payout_request_status as enum
  ('pending', 'approved', 'rejected', 'processing', 'success', 'failed', 'reversed');

create type payout_transaction_status as enum
  ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');

-- ----------------------------------------------------------------------------
-- payout_accounts: ONE current bank account per organization. Changing it
-- must reset verification (enforced in application code, not here, since
-- "changing the account number resets status" is a business rule best kept
-- in one place - the server action - rather than a trigger that could
-- surprise a future migration author).
-- ----------------------------------------------------------------------------
create table payout_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade unique,
  account_holder_name text not null,
  account_number text not null,          -- full number; masked at the UI layer, never sent to the browser
  ifsc_code text not null,                -- NOT secret - a public bank branch code
  bank_name text,                         -- populated from the verification response
  bank_verification_status bank_verification_status not null default 'NOT_VERIFIED',
  cashfree_beneficiary_id text,           -- set once a Cashfree Payouts beneficiary exists for this account
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payout_accounts_updated_at
  before update on payout_accounts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- payout_verifications: one row per verification ATTEMPT (retries produce
-- new rows, preserving history). payout_accounts.bank_verification_status is
-- the denormalized "current" value for fast eligibility checks.
-- ----------------------------------------------------------------------------
create table payout_verifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  payout_account_id uuid not null references payout_accounts(id) on delete cascade,
  provider text not null default 'cashfree',
  provider_reference_id text,
  status bank_verification_status not null,
  name_match_result text,                 -- DIRECT_MATCH / GOOD_PARTIAL_MATCH / MODERATE_PARTIAL_MATCH / POOR_PARTIAL_MATCH / NO_MATCH
  name_match_score numeric(5, 2),
  matched_bank_name text,
  failure_reason text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);
create index idx_payout_verifications_account on payout_verifications(payout_account_id);
create index idx_payout_verifications_org on payout_verifications(organization_id);

-- ----------------------------------------------------------------------------
-- payout_requests: created by a platform admin with a manually-entered
-- amount. V1 has NO internal wallet/escrow/stored balance - the amount is
-- reconciled against `payments` out of band by whoever creates the request.
-- ----------------------------------------------------------------------------
create table payout_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  status payout_request_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payout_requests_updated_at
  before update on payout_requests
  for each row execute function set_updated_at();
create index idx_payout_requests_org on payout_requests(organization_id);
create index idx_payout_requests_org_status on payout_requests(organization_id, status);

-- ----------------------------------------------------------------------------
-- payout_transactions: the actual Cashfree transfer attempt(s) for a
-- request. A failed transfer can be retried -> a NEW row, never mutate a
-- terminal transaction in place.
-- ----------------------------------------------------------------------------
create table payout_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  payout_request_id uuid not null references payout_requests(id) on delete cascade,
  provider text not null default 'cashfree',
  provider_transfer_id text,              -- our own transfer_id sent to Cashfree
  provider_cf_transfer_id text,           -- Cashfree's own cf_transfer_id
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  status payout_transaction_status not null default 'PENDING',
  utr text,
  failure_reason text,
  raw_webhook_payload jsonb,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payout_transactions_updated_at
  before update on payout_transactions
  for each row execute function set_updated_at();
create unique index uq_payout_transactions_provider_transfer on payout_transactions(provider, provider_transfer_id);
create index idx_payout_transactions_org on payout_transactions(organization_id);
create index idx_payout_transactions_request on payout_transactions(payout_request_id);
create index idx_payout_transactions_status on payout_transactions(status);

-- ----------------------------------------------------------------------------
-- payout_reconciliations: one row per reconciliation CHECK, comparing our
-- stored status against Cashfree's Get Transfer Status V2 response.
-- ----------------------------------------------------------------------------
create table payout_reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  payout_transaction_id uuid not null references payout_transactions(id) on delete cascade,
  previous_status payout_transaction_status not null,
  checked_status payout_transaction_status not null,
  corrected boolean not null default false,
  raw_response jsonb,
  created_at timestamptz not null default now()
);
create index idx_payout_reconciliations_transaction on payout_reconciliations(payout_transaction_id);
create index idx_payout_reconciliations_org on payout_reconciliations(organization_id);

-- ----------------------------------------------------------------------------
-- payout_audit_logs: append-only. Every payout-related state change writes
-- here. No client can ever forge an entry (see 0011's RLS: no INSERT policy
-- at all - only service role, as a side effect of trusted server code).
-- ----------------------------------------------------------------------------
create table payout_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),   -- null for system/webhook/cron-triggered events
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',            -- summary only - NEVER a raw account number
  created_at timestamptz not null default now()
);
create index idx_payout_audit_logs_org on payout_audit_logs(organization_id);
create index idx_payout_audit_logs_entity on payout_audit_logs(entity_type, entity_id);
