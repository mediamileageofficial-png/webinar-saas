-- ============================================================================
-- 0004_platform_admin_policies.sql
--
-- Platform admins can already SELECT across every tenant table (org_select_member
-- and the generic tenant policies in 0002 both include `is_platform_admin() OR ...`).
-- What's still missing is WRITE access for the platform-admin console itself:
-- suspending/activating an organization. Postgres combines multiple permissive
-- policies for the same command with OR, so this simply adds an additional
-- allowed path for UPDATE on organizations without touching the existing
-- owner-update policy from 0002.
-- ============================================================================

create policy org_update_platform_admin on organizations for update
  using (is_platform_admin());

-- ----------------------------------------------------------------------------
-- RLS is row-level, not column-level: the org_update_owner policy from 0002
-- lets an owner update any column on their own org row, including `status`.
-- That means an owner could simply flip `status` back to 'active' after a
-- platform admin suspends them - defeating the entire suspend feature. A
-- BEFORE UPDATE trigger enforces the column-level rule RLS can't express:
-- only a platform admin may change `status`.
-- ----------------------------------------------------------------------------
create or replace function prevent_status_change_by_non_admin() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not is_platform_admin() then
    raise exception 'Only a platform admin can change organization status';
  end if;
  return new;
end;
$$;

create trigger trg_organizations_status_guard
  before update on organizations
  for each row execute function prevent_status_change_by_non_admin();
