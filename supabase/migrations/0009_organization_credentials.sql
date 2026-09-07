-- ============================================================================
-- 0009_organization_credentials.sql
--
-- Section 22 of the plan requires per-ORGANIZATION MSG91/Cashfree/email
-- credentials ("Integration settings: MSG91, Payment gateway, Email
-- provider. Credentials must be stored securely.") - not platform-wide env
-- vars. This table holds them.
--
-- Security model: RLS is enabled with ZERO policies, same pattern as
-- platform_admins - this is a hard default-deny for every role except
-- service_role. That means NOT EVEN the organization's own owner can read or
-- write this table directly via the normal RLS-respecting client. All access
-- goes exclusively through server actions that (a) verify authorization via
-- requireOrgRole() first, then (b) use the service-role admin client. The
-- database itself trusts nothing but service_role; application code is the
-- sole gatekeeper. This is deliberately stricter than a normal tenant table.
-- ============================================================================

create table organization_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('msg91', 'cashfree', 'email')),
  credentials jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create trigger trg_organization_credentials_updated_at
  before update on organization_credentials
  for each row execute function set_updated_at();

alter table organization_credentials enable row level security;
-- Intentionally no policies: default-deny for all roles except service_role.

create index idx_organization_credentials_org on organization_credentials(organization_id);
