-- ============================================================================
-- 0001_core_schema.sql
-- Core multi-tenant schema: organizations, membership, webinars, forms,
-- registrations, payments, messaging, automation, attendance, campaigns.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- updated_at trigger helper (shared by every table below)
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- CORE TENANCY
-- ============================================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  contact_email text,
  contact_phone text,
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'active' check (status in ('active','suspended')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create table platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create type org_role as enum ('organization_owner','organization_admin','staff','viewer');

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'staff',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_org_members_user on organization_members(user_id);
create index idx_org_members_org on organization_members(organization_id);

-- ============================================================================
-- WEBINARS
-- ============================================================================
create type webinar_status as enum
  ('draft','published','registration_open','registration_closed','completed','cancelled');

create table webinars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  event_date date not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  timezone text not null default 'Asia/Kolkata',
  speaker_name text,
  speaker_details text,
  platform text,
  join_url text,
  recording_url text,
  status webinar_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_webinar_time_order check (end_time > start_time)
);
create index idx_webinars_org on webinars(organization_id);
create index idx_webinars_org_status on webinars(organization_id, status);
create trigger trg_webinars_updated_at
  before update on webinars
  for each row execute function set_updated_at();

-- ============================================================================
-- FORMS + FIELDS
-- ============================================================================
create table forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete set null,
  name text not null,
  description text,
  public_slug text not null unique,
  is_published boolean not null default false,
  success_message text,
  redirect_url text,
  submit_button_text text not null default 'Register',
  logo_url text,
  branding jsonb not null default '{}',
  is_paid boolean not null default false,
  price_amount numeric(10,2),
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_paid_form_has_price check (
    (is_paid = false) or (is_paid = true and price_amount is not null and price_amount > 0)
  )
);
create index idx_forms_org on forms(organization_id);
create trigger trg_forms_updated_at
  before update on forms
  for each row execute function set_updated_at();

create type field_type as enum
  ('full_name','first_name','last_name','email','mobile','dob','gender','city','state',
   'country','education','text','textarea','number','dropdown','radio','checkbox','date','consent');

create table form_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  form_id uuid not null references forms(id) on delete cascade,
  field_type field_type not null,
  field_key text not null,
  label text not null,
  placeholder text,
  help_text text,
  is_required boolean not null default false,
  options jsonb,
  validation jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (form_id, field_key)
);
create index idx_form_fields_form on form_fields(form_id);

-- ============================================================================
-- REGISTRATIONS
-- ============================================================================
create type registration_status as enum
  ('pending','confirmed','cancelled','attended','no_show');
create type payment_status as enum
  ('not_applicable','pending','initiated','success','failed','cancelled','refunded');

create table registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  form_id uuid not null references forms(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete set null,
  full_name text,
  email text,
  mobile text,
  status registration_status not null default 'pending',
  payment_status payment_status not null default 'not_applicable',
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  referrer text,
  landing_page text,
  ip_hash text,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_registrations_org on registrations(organization_id);
create index idx_registrations_webinar on registrations(webinar_id);
create index idx_registrations_form on registrations(form_id);
create index idx_registrations_email on registrations(email);
create index idx_registrations_mobile on registrations(mobile);
create index idx_registrations_created on registrations(created_at);
create index idx_registrations_payment_status on registrations(payment_status);
create unique index uq_registrations_form_dedupe on registrations(form_id, dedupe_key);
create trigger trg_registrations_updated_at
  before update on registrations
  for each row execute function set_updated_at();

create table registration_values (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  registration_id uuid not null references registrations(id) on delete cascade,
  field_id uuid not null references form_fields(id) on delete cascade,
  value text,
  created_at timestamptz not null default now()
);
create index idx_registration_values_reg on registration_values(registration_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  registration_id uuid not null references registrations(id) on delete cascade,
  provider text not null default 'cashfree',
  provider_order_id text,
  provider_payment_id text,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status payment_status not null default 'pending',
  raw_webhook_payload jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);
create index idx_payments_org on payments(organization_id);
create index idx_payments_registration on payments(registration_id);
create index idx_payments_status on payments(status);
create unique index uq_payments_provider_order on payments(provider, provider_order_id);
create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ============================================================================
-- MESSAGING
-- ============================================================================
create type message_channel as enum ('sms','whatsapp','email');

create table message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  channel message_channel not null,
  version int not null default 1,
  subject text,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, key, channel, version)
);
create index idx_message_templates_org on message_templates(organization_id);

create table automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  webinar_id uuid references webinars(id) on delete cascade,
  trigger text not null check (trigger in (
    'registration_created','payment_success','before_webinar','after_webinar','no_show'
  )),
  offset_minutes int,
  channel message_channel not null,
  template_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_automation_rules_org_webinar on automation_rules(organization_id, webinar_id);

create table message_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  registration_id uuid references registrations(id) on delete set null,
  channel message_channel not null,
  template_key text,
  recipient text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  provider_message_id text,
  failure_reason text,
  dedupe_key text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (dedupe_key)
);
create index idx_message_logs_org on message_logs(organization_id);
create index idx_message_logs_registration on message_logs(registration_id);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  registration_id uuid not null references registrations(id) on delete cascade,
  webinar_id uuid not null references webinars(id) on delete cascade,
  attended boolean not null default false,
  marked_at timestamptz not null default now(),
  unique (registration_id)
);
create index idx_attendance_webinar on attendance(webinar_id);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  utm_campaign text,
  created_at timestamptz not null default now()
);
create index idx_campaigns_org on campaigns(organization_id);
