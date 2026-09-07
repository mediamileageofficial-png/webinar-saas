insert into auth.users (id, email) values ('88888888-8888-8888-8888-888888888888', 'owner-g@example.com');
insert into organizations (id, name, slug) values ('11111111-2222-3333-4444-555555555555', 'Org G', 'org-g');
insert into organization_members (organization_id, user_id, role) values
  ('11111111-2222-3333-4444-555555555555', '88888888-8888-8888-8888-888888888888', 'organization_owner');

set role app_authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-8888-8888-888888888888', false);

\echo 'Insert webinar with end_time BEFORE start_time (expect CHECK constraint ERROR):'
insert into webinars (organization_id, name, event_date, start_time, end_time)
values ('11111111-2222-3333-4444-555555555555', 'Bad Webinar', '2026-10-01', '2026-10-01 12:00+00', '2026-10-01 10:00+00');

\echo 'Insert a valid webinar (expect success):'
insert into webinars (id, organization_id, name, event_date, start_time, end_time)
values ('99999999-9999-9999-9999-999999999999', '11111111-2222-3333-4444-555555555555', 'Good Webinar', '2026-10-01', '2026-10-01 10:00+00', '2026-10-01 11:00+00');
select name, status from webinars where id = '99999999-9999-9999-9999-999999999999';

reset role;
delete from webinars where organization_id = '11111111-2222-3333-4444-555555555555';
delete from organization_members where organization_id = '11111111-2222-3333-4444-555555555555';
delete from organizations where id = '11111111-2222-3333-4444-555555555555';
delete from auth.users where id = '88888888-8888-8888-8888-888888888888';
\echo 'DONE'
