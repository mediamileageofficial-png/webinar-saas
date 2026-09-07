-- ============================================================================
-- org_bootstrap_test.sql (dev-only)
-- Verifies: (1) a plain authenticated user CANNOT insert into organizations
-- directly (RLS blocks it), and (2) create_organization_with_owner() lets
-- that same user self-serve create exactly one org + owner membership.
-- ============================================================================

insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'new-user@example.com');

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;
end $$;
grant authenticated to app_authenticated;
grant usage on schema public to app_authenticated;
grant select, insert, update, delete on all tables in schema public to app_authenticated;
grant usage on schema auth to app_authenticated;
grant select on auth.users to app_authenticated;

\echo '--- Impersonating brand-new user (no org yet) ---'
set role app_authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

\echo 'Direct INSERT into organizations (expect RLS ERROR - only platform_admin can):'
insert into organizations (name, slug) values ('Sneaky Org', 'sneaky-org');

\echo 'Calling create_organization_with_owner() (expect success, returns slug):'
select create_organization_with_owner('New Academy', 'new-academy') as created_slug;

\echo 'The same user should now see exactly this one org:'
select o.name, o.slug, m.role
from organizations o
join organization_members m on m.organization_id = o.id
where m.user_id = '33333333-3333-3333-3333-333333333333';

\echo 'Calling it again with a duplicate slug (expect unique-constraint ERROR):'
select create_organization_with_owner('Another Academy', 'new-academy');

reset role;

\echo '--- Cleanup ---'
delete from organization_members where organization_id in (select id from organizations where slug = 'new-academy');
delete from organizations where slug in ('new-academy', 'sneaky-org');
delete from auth.users where id = '33333333-3333-3333-3333-333333333333';

\echo 'DONE'
