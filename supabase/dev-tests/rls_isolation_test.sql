-- ============================================================================
-- rls_isolation_test.sql (dev-only)
-- Proves that RLS actually isolates two tenants from each other.
-- Run with: psql -d webinar_saas_test -f rls_isolation_test.sql
-- ============================================================================

-- Note: intentionally NOT using ON_ERROR_STOP here - one of the assertions
-- below is expected to raise an RLS policy violation, and we want the script
-- to continue past it and run cleanup regardless.

-- Two fake auth users
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.com');

-- Two orgs, created as service-role style (bypass RLS via superuser for setup)
insert into organizations (id, name, slug) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', 'org-a'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', 'org-b');

insert into organization_members (organization_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'organization_owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'organization_owner');

insert into webinars (id, organization_id, name, event_date, start_time, end_time) values
  ('c0000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A Webinar', '2026-10-01', '2026-10-01 10:00+00', '2026-10-01 11:00+00'),
  ('c0000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B Webinar', '2026-10-01', '2026-10-01 10:00+00', '2026-10-01 11:00+00');

-- Create a low-privilege role that RLS will actually apply to (superuser
-- bypasses RLS entirely, so we must NOT run the assertions as postgres).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;
end $$;
grant usage on schema public to app_authenticated;
grant select, insert, update, delete on all tables in schema public to app_authenticated;
grant usage on schema auth to app_authenticated;
grant select on auth.users to app_authenticated;

\echo '--- Impersonating Org A owner ---'
set role app_authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo 'Org A owner sees these webinars (expect only Org A Webinar):'
select name from webinars order by name;

\echo 'Org A owner sees these organizations (expect only Org A):'
select name from organizations order by name;

reset role;

\echo '--- Impersonating Org B owner ---'
set role app_authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

\echo 'Org B owner sees these webinars (expect only Org B Webinar):'
select name from webinars order by name;

\echo 'Attempting cross-tenant UPDATE of Org A webinar as Org B owner (expect 0 rows updated):'
update webinars set name = 'HACKED' where id = 'c0000000-0000-0000-0000-00000000000a';
select name from webinars where id = 'c0000000-0000-0000-0000-00000000000a';

\echo 'Attempting cross-tenant INSERT into Org A as Org B owner (expect ERROR / 0 rows):'
insert into webinars (organization_id, name, event_date, start_time, end_time)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Injected', '2026-10-01', '2026-10-01 10:00+00', '2026-10-01 11:00+00');

reset role;

\echo '--- Unauthenticated (no JWT claim set) ---'
set role app_authenticated;
select set_config('request.jwt.claim.sub', '', false);
\echo 'Anonymous/no-membership caller sees these webinars (expect 0 rows):'
select name from webinars;
reset role;

\echo '--- Cleanup ---'
reset role;
delete from webinars where organization_id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
delete from organization_members where organization_id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
delete from organizations where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222'
);

\echo 'DONE'
