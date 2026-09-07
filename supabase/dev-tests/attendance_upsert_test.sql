insert into organizations (id, name, slug) values ('88889999-0000-0000-0000-000000000088', 'Org S', 'org-s');
insert into forms (id, organization_id, name, public_slug) values
  ('99990000-0000-0000-0000-000000000099', '88889999-0000-0000-0000-000000000088', 'Form S', 'form-s');
insert into webinars (id, organization_id, name, event_date, start_time, end_time, status) values
  ('aaaa0000-0000-0000-0000-0000000000aa', '88889999-0000-0000-0000-000000000088', 'Webinar S',
   '2026-09-01', '2026-09-01 10:00:00+00', '2026-09-01 11:00:00+00', 'completed');
insert into registrations (id, organization_id, form_id, webinar_id, email, status, dedupe_key) values
  ('bbbb0000-0000-0000-0000-0000000000bb', '88889999-0000-0000-0000-000000000088', '99990000-0000-0000-0000-000000000099',
   'aaaa0000-0000-0000-0000-0000000000aa', 'attendee@example.com', 'confirmed', 'dk-s-1');

\echo 'Mark attended (upsert insert):'
insert into attendance (organization_id, registration_id, webinar_id, attended)
values ('88889999-0000-0000-0000-000000000088', 'bbbb0000-0000-0000-0000-0000000000bb', 'aaaa0000-0000-0000-0000-0000000000aa', true)
on conflict (registration_id) do update set attended = excluded.attended, marked_at = now();
select attended from attendance where registration_id = 'bbbb0000-0000-0000-0000-0000000000bb';

\echo 'Registration status is UNCHANGED (still confirmed, per the plan - attendance is separate):'
select status from registrations where id = 'bbbb0000-0000-0000-0000-0000000000bb';

\echo 'Admin changes their mind: mark as NO-SHOW instead (upsert update, not a second row):'
insert into attendance (organization_id, registration_id, webinar_id, attended)
values ('88889999-0000-0000-0000-000000000088', 'bbbb0000-0000-0000-0000-0000000000bb', 'aaaa0000-0000-0000-0000-0000000000aa', false)
on conflict (registration_id) do update set attended = excluded.attended, marked_at = now();

\echo 'Exactly ONE attendance row exists for this registration (upsert, not duplicate):'
select count(*) as row_count, bool_and(attended) as still_true from attendance where registration_id = 'bbbb0000-0000-0000-0000-0000000000bb';
select attended from attendance where registration_id = 'bbbb0000-0000-0000-0000-0000000000bb';

\echo 'Registration status STILL unchanged (confirmed) - proving the separation holds after flipping attendance:'
select status from registrations where id = 'bbbb0000-0000-0000-0000-0000000000bb';

delete from attendance where registration_id = 'bbbb0000-0000-0000-0000-0000000000bb';
delete from registrations where id = 'bbbb0000-0000-0000-0000-0000000000bb';
delete from webinars where id = 'aaaa0000-0000-0000-0000-0000000000aa';
delete from forms where id = '99990000-0000-0000-0000-000000000099';
delete from organizations where id = '88889999-0000-0000-0000-000000000088';
\echo 'DONE'
