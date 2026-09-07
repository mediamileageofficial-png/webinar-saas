-- Demonstrates why every app-level query MUST add .eq('organization_id', X)
-- even though RLS already restricts rows to orgs the user belongs to: RLS
-- allows ANY org the user is a member of, not specifically the org whose
-- dashboard they're currently viewing.

insert into auth.users (id, email) values ('77777777-7777-7777-7777-777777777777', 'multi-org@example.com');

insert into organizations (id, name, slug) values
  ('e0000000-0000-0000-0000-00000000000e', 'Org E', 'org-e'),
  ('f0000000-0000-0000-0000-00000000000f', 'Org F', 'org-f');

-- Same user is staff in BOTH orgs (e.g. a contractor who works for two academies)
insert into organization_members (organization_id, user_id, role) values
  ('e0000000-0000-0000-0000-00000000000e', '77777777-7777-7777-7777-777777777777', 'staff'),
  ('f0000000-0000-0000-0000-00000000000f', '77777777-7777-7777-7777-777777777777', 'staff');

insert into webinars (id, organization_id, name, event_date, start_time, end_time) values
  ('90000000-0000-0000-0000-000000000e01', 'e0000000-0000-0000-0000-00000000000e', 'Org E Webinar', '2026-10-01', '2026-10-01 10:00+00', '2026-10-01 11:00+00'),
  ('90000000-0000-0000-0000-000000000f01', 'f0000000-0000-0000-0000-00000000000f', 'Org F Webinar', '2026-10-01', '2026-10-01 10:00+00', '2026-10-01 11:00+00');

set role app_authenticated;
select set_config('request.jwt.claim.sub', '77777777-7777-7777-7777-777777777777', false);

\echo 'UNFILTERED query while "viewing" Org E dashboard (BUG if app forgot the filter - leaks Org F too):'
select name from webinars order by name;

\echo 'CORRECT: query explicitly filtered to Org E (what the app must always do):'
select name from webinars where organization_id = 'e0000000-0000-0000-0000-00000000000e';

reset role;
delete from webinars where organization_id in ('e0000000-0000-0000-0000-00000000000e','f0000000-0000-0000-0000-00000000000f');
delete from organization_members where organization_id in ('e0000000-0000-0000-0000-00000000000e','f0000000-0000-0000-0000-00000000000f');
delete from organizations where id in ('e0000000-0000-0000-0000-00000000000e','f0000000-0000-0000-0000-00000000000f');
delete from auth.users where id = '77777777-7777-7777-7777-777777777777';
\echo 'DONE'
