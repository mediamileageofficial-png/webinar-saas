-- ============================================================================
-- 0002_rls_policies.sql
-- Row Level Security: enforces tenant isolation at the database layer.
-- Every tenant table is scoped to organizations the caller belongs to via
-- organization_members. Write policies are further scoped by role.
--
-- IMPORTANT: membership checks go through the SECURITY DEFINER helper
-- functions below (is_org_member / is_platform_admin), never through a raw
-- subquery against organization_members inside a policy. organization_members
-- itself is RLS-protected, so a policy on it (or on any other table) that
-- subqueries it directly causes Postgres to recursively re-apply that same
-- policy while evaluating the subquery -> "infinite recursion detected in
-- policy" errors. SECURITY DEFINER functions run with the function owner's
-- privileges (the table owner, which bypasses its own RLS by default),
-- sidestepping the recursion while still deriving membership from the table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the current JWT subject a platform admin?
-- ----------------------------------------------------------------------------
create or replace function is_platform_admin() returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from platform_admins where user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------------------------
-- Helper: does the current user belong to target_org_id, optionally with one
-- of allowed_roles? This is the single source of truth every tenant-table
-- policy calls into - never inline a subquery on organization_members again.
-- ----------------------------------------------------------------------------
create or replace function is_org_member(target_org_id uuid, allowed_roles org_role[] default null)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and (allowed_roles is null or role = any(allowed_roles))
  );
$$;

-- ----------------------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------------------
alter table organizations enable row level security;

create policy org_select_member on organizations for select
  using (is_platform_admin() or is_org_member(id));

create policy org_update_owner on organizations for update
  using (is_org_member(id, array['organization_owner']::org_role[]));

create policy org_insert_platform_admin on organizations for insert
  with check (is_platform_admin());

-- ----------------------------------------------------------------------------
-- organization_members
-- ----------------------------------------------------------------------------
alter table organization_members enable row level security;

create policy members_select_self_org on organization_members for select
  using (is_platform_admin() or is_org_member(organization_id));

create policy members_write_owner_admin on organization_members for insert
  with check (is_org_member(organization_id, array['organization_owner','organization_admin']::org_role[]));

create policy members_update_owner_admin on organization_members for update
  using (is_org_member(organization_id, array['organization_owner','organization_admin']::org_role[]));

create policy members_delete_owner_admin on organization_members for delete
  using (is_org_member(organization_id, array['organization_owner','organization_admin']::org_role[]));

-- ----------------------------------------------------------------------------
-- platform_admins - locked down; only readable via is_platform_admin(), no
-- direct client access at all.
-- ----------------------------------------------------------------------------
alter table platform_admins enable row level security;
-- Intentionally no policies: default-deny for all roles except service_role.

-- ----------------------------------------------------------------------------
-- Generic tenant-table policies via is_org_member(), applied to every
-- remaining tenant table that shares the standard organization_id pattern.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  write_tables text[] := array[
    'webinars', 'forms', 'form_fields', 'registrations', 'registration_values',
    'payments', 'message_templates', 'automation_rules', 'message_logs',
    'attendance', 'campaigns'
  ];
begin
  foreach t in array write_tables loop
    execute format('alter table %I enable row level security;', t);

    execute format($f$
      create policy %I on %I for select
      using (is_platform_admin() or is_org_member(organization_id));
    $f$, t || '_select', t);

    execute format($f$
      create policy %I on %I for insert
      with check (is_org_member(organization_id, array['organization_owner','organization_admin','staff']::org_role[]));
    $f$, t || '_insert', t);

    execute format($f$
      create policy %I on %I for update
      using (is_org_member(organization_id, array['organization_owner','organization_admin','staff']::org_role[]));
    $f$, t || '_update', t);

    execute format($f$
      create policy %I on %I for delete
      using (is_org_member(organization_id, array['organization_owner','organization_admin']::org_role[]));
    $f$, t || '_delete', t);
  end loop;
end $$;
