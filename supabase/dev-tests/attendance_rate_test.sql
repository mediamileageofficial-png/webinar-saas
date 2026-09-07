insert into organizations (id, name, slug) values ('cccc0000-0000-0000-0000-0000000000cc', 'Org T', 'org-t');
insert into forms (id, organization_id, name, public_slug) values
  ('dddd0000-0000-0000-0000-0000000000dd', 'cccc0000-0000-0000-0000-0000000000cc', 'Form T', 'form-t');
insert into webinars (id, organization_id, name, event_date, start_time, end_time, status) values
  ('eeee0000-0000-0000-0000-0000000000ee', 'cccc0000-0000-0000-0000-0000000000cc', 'Webinar T',
   '2026-09-01', '2026-09-01 10:00:00+00', '2026-09-01 11:00:00+00', 'completed');

-- 4 registrations, 3 marked attended, 1 marked no-show -> expect 75% rate
insert into registrations (id, organization_id, form_id, webinar_id, email, status, dedupe_key) values
  ('f0000001-0000-0000-0000-0000000000f1', 'cccc0000-0000-0000-0000-0000000000cc', 'dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'a@x.com', 'confirmed', 'dk-t-1'),
  ('f0000002-0000-0000-0000-0000000000f2', 'cccc0000-0000-0000-0000-0000000000cc', 'dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'b@x.com', 'confirmed', 'dk-t-2'),
  ('f0000003-0000-0000-0000-0000000000f3', 'cccc0000-0000-0000-0000-0000000000cc', 'dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'c@x.com', 'confirmed', 'dk-t-3'),
  ('f0000004-0000-0000-0000-0000000000f4', 'cccc0000-0000-0000-0000-0000000000cc', 'dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'd@x.com', 'confirmed', 'dk-t-4');

insert into attendance (organization_id, registration_id, webinar_id, attended) values
  ('cccc0000-0000-0000-0000-0000000000cc', 'f0000001-0000-0000-0000-0000000000f1', 'eeee0000-0000-0000-0000-0000000000ee', true),
  ('cccc0000-0000-0000-0000-0000000000cc', 'f0000002-0000-0000-0000-0000000000f2', 'eeee0000-0000-0000-0000-0000000000ee', true),
  ('cccc0000-0000-0000-0000-0000000000cc', 'f0000003-0000-0000-0000-0000000000f3', 'eeee0000-0000-0000-0000-0000000000ee', true),
  ('cccc0000-0000-0000-0000-0000000000cc', 'f0000004-0000-0000-0000-0000000000f4', 'eeee0000-0000-0000-0000-0000000000ee', false);

\echo 'Replicating the dashboard formula: attended_count / total_marked * 100 (expect 75%):'
select
  count(*) filter (where attended) as attended_count,
  count(*) as total_marked,
  round(100.0 * count(*) filter (where attended) / count(*), 0) as attendance_rate_pct,
  count(*) filter (where not attended) as no_show_count
from attendance where organization_id = 'cccc0000-0000-0000-0000-0000000000cc';

delete from attendance where organization_id = 'cccc0000-0000-0000-0000-0000000000cc';
delete from registrations where organization_id = 'cccc0000-0000-0000-0000-0000000000cc';
delete from webinars where id = 'eeee0000-0000-0000-0000-0000000000ee';
delete from forms where id = 'dddd0000-0000-0000-0000-0000000000dd';
delete from organizations where id = 'cccc0000-0000-0000-0000-0000000000cc';
\echo 'DONE'
