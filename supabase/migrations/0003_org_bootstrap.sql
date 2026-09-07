-- ============================================================================
-- 0003_org_bootstrap.sql
--
-- RLS deliberately blocks a plain authenticated user from inserting directly
-- into `organizations` (see 0002 - only is_platform_admin() can). Self-serve
-- signup still needs a way for a brand-new user to create their first org and
-- become its owner, atomically, without ever letting the client choose an
-- organization_id or grant themselves a role. This SECURITY DEFINER function
-- is the single, narrow bootstrap path for that: it creates the organization
-- row itself and inserts exactly one 'organization_owner' membership row for
-- the caller (auth.uid()), in one transaction.
-- ============================================================================

create or replace function create_organization_with_owner(org_name text, org_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  insert into organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (new_org_id, caller, 'organization_owner');

  return org_slug;
end;
$$;

revoke all on function create_organization_with_owner(text, text) from public;
grant execute on function create_organization_with_owner(text, text) to authenticated;
