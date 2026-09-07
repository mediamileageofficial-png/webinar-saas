insert into organizations (id, name, slug) values ('11110000-0000-0000-0000-000000000111', 'Org U', 'org-u');
insert into forms (id, organization_id, name, public_slug) values
  ('22220000-0000-0000-0000-000000000222', '11110000-0000-0000-0000-000000000111', 'Form U', 'form-u');
insert into webinars (id, organization_id, name, event_date, start_time, end_time, status) values
  ('33330000-0000-0000-0000-000000000333', '11110000-0000-0000-0000-000000000111', 'Webinar U',
   '2026-09-01', '2026-09-01 10:00:00+00', '2026-09-01 11:00:00+00', 'completed');
insert into registrations (id, organization_id, form_id, webinar_id, full_name, email, status, dedupe_key) values
  ('44440000-0000-0000-0000-000000000444', '11110000-0000-0000-0000-000000000111', '22220000-0000-0000-0000-000000000222',
   '33330000-0000-0000-0000-000000000333', 'No Show Person', 'noshow@example.com', 'confirmed', 'dk-u-1');

-- Org-wide no_show rule (webinar_id = null applies to all webinars, per the
-- convention documented in the schema).
insert into automation_rules (id, organization_id, webinar_id, trigger, channel, template_key, is_active) values
  ('55550000-0000-0000-0000-000000000555', '11110000-0000-0000-0000-000000000111', null, 'no_show', 'email', 'no_show_followup', true);

\echo 'Replicating attendance-actions.ts: mark no-show, then look up matching no_show rules:'
insert into attendance (organization_id, registration_id, webinar_id, attended)
values ('11110000-0000-0000-0000-000000000111', '44440000-0000-0000-0000-000000000444', '33330000-0000-0000-0000-000000000333', false)
on conflict (registration_id) do update set attended = excluded.attended;

\echo 'The .or(webinar_id.eq.X,webinar_id.is.null) filter, replicated in SQL - should match the org-wide rule:'
select id, channel, template_key from automation_rules
where organization_id = '11110000-0000-0000-0000-000000000111'
  and trigger = 'no_show'
  and is_active = true
  and (webinar_id = '33330000-0000-0000-0000-000000000333' or webinar_id is null);

\echo 'sendTemplatedMessage reserves a log row keyed by registration+template+channel+RULE ID (same idempotent pattern as Phase 9):'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('11110000-0000-0000-0000-000000000111', '44440000-0000-0000-0000-000000000444', 'email', 'no_show_followup', 'noshow@example.com', 'queued',
        '44440000-0000-0000-0000-000000000444:no_show_followup:email:55550000-0000-0000-0000-000000000555');
select channel, template_key, status from message_logs where registration_id = '44440000-0000-0000-0000-000000000444';

\echo 'Registration status remains confirmed - not overwritten to a nonexistent "no_show" registration status:'
select status from registrations where id = '44440000-0000-0000-0000-000000000444';

delete from message_logs where registration_id = '44440000-0000-0000-0000-000000000444';
delete from attendance where registration_id = '44440000-0000-0000-0000-000000000444';
delete from automation_rules where id = '55550000-0000-0000-0000-000000000555';
delete from registrations where id = '44440000-0000-0000-0000-000000000444';
delete from webinars where id = '33330000-0000-0000-0000-000000000333';
delete from forms where id = '22220000-0000-0000-0000-000000000222';
delete from organizations where id = '11110000-0000-0000-0000-000000000111';
\echo 'DONE'
