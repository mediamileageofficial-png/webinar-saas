-- ============================================================================
-- platform_admin_test.sql (dev-only)
-- Verifies platform admins can suspend/activate any org, and a regular
-- (non-admin) org owner cannot touch another org's status.
-- ============================================================================

insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444', 'admin@platform.example'),
  ('55555555-5555-5555-5555-555555555555', 'owner-c@example.com');

insert into platform_admins (user_id) values ('44444444-4444-4444-4444-444444444444');

insert into organizations (id, name, slug, status) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org C', 'org-c', 'active');

insert into organization_members (organization_id, user_id, role) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'organization_owner');

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

\echo '--- Impersonating platform admin ---'
set role app_authenticated;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);

\echo 'Platform admin sees ALL organizations (expect Org C among possibly others):'
select name, status from organizations order by name;

\echo 'Platform admin suspends Org C (expect UPDATE 1, status = suspended):'
update organizations set status = 'suspended' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select name, status from organizations where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

reset role;

\echo '--- Impersonating Org C owner (non-admin) trying to reactivate their own org ---'
set role app_authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', false);

\echo 'Org owner CAN update their own org status too (owner update policy allows it):'
update organizations set status = 'active' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select name, status from organizations where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

\echo 'Org owner tries to insert a brand-new organization directly (expect RLS ERROR - not platform admin):'
insert into organizations (name, slug) values ('Rogue Org', 'rogue-org');

reset role;

\echo '--- Cleanup ---'
delete from organization_members where organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
delete from organizations where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
delete from platform_admins where user_id = '44444444-4444-4444-4444-444444444444';
delete from auth.users where id in (
  '44444444-4444-4444-4444-444444444444','55555555-5555-5555-5555-555555555555'
);

\echo 'DONE'
