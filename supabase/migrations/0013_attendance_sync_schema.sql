-- ============================================================================
-- 0013_attendance_sync_schema.sql
--
-- Adds optional video-provider linkage to webinars and a log of sync
-- attempts. Deliberately additive - existing webinars/attendance flows are
-- completely unaffected for tenants who never set a meeting_provider
-- (manual attendance marking, from Phase 10, keeps working exactly as before).
-- ============================================================================

create type meeting_provider as enum ('zoom', 'google_meet');

alter table webinars add column meeting_provider meeting_provider;
alter table webinars add column provider_meeting_id text;

create table attendance_sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  webinar_id uuid not null references webinars(id) on delete cascade,
  provider meeting_provider not null,
  matched_count int not null default 0,
  unmatched_count int not null default 0,
  status text not null check (status in ('success', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now()
);
create index idx_attendance_sync_logs_webinar on attendance_sync_logs(webinar_id);
create index idx_attendance_sync_logs_org on attendance_sync_logs(organization_id);

alter table attendance_sync_logs enable row level security;

create policy attendance_sync_logs_select on attendance_sync_logs for select
  using (is_platform_admin() or is_org_member(organization_id));

create policy attendance_sync_logs_insert on attendance_sync_logs for insert
  with check (
    is_org_member(organization_id, array['organization_owner','organization_admin','staff']::org_role[])
  );
