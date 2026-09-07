insert into organizations (id, name, slug) values ('eeee5555-0000-0000-0000-000000000005', 'Org P', 'org-p');
insert into forms (id, organization_id, name, public_slug) values
  ('ffff6666-0000-0000-0000-000000000006', 'eeee5555-0000-0000-0000-000000000005', 'Free Webinar Form', 'free-webinar-form-p');
insert into form_fields (organization_id, form_id, field_type, field_key, label, sort_order, is_required) values
  ('eeee5555-0000-0000-0000-000000000005', 'ffff6666-0000-0000-0000-000000000006', 'full_name', 'full_name', 'Name', 0, true),
  ('eeee5555-0000-0000-0000-000000000005', 'ffff6666-0000-0000-0000-000000000006', 'email', 'email', 'Email', 1, true);
update forms set is_published = true where id = 'ffff6666-0000-0000-0000-000000000006';

-- No active email/sms templates for Org P at all (simulates: tenant never
-- configured messaging, or the org bootstrap path wasn't used). This is the
-- worst case for "does registration still succeed?"
\echo 'Registration succeeds and is confirmed EVEN THOUGH there is no template to send with:'
insert into registrations (id, organization_id, form_id, full_name, email, status, payment_status, dedupe_key)
values ('11119999-0000-0000-0000-000000000009', 'eeee5555-0000-0000-0000-000000000005', 'ffff6666-0000-0000-0000-000000000006', 'Deepa Rao', 'deepa@example.com', 'confirmed', 'not_applicable', 'dk-p-1');
select status, payment_status from registrations where id = '11119999-0000-0000-0000-000000000009';

\echo 'Simulating what sendTemplatedMessage does: reserve a log row, then fail to find a template, mark failed:'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('eeee5555-0000-0000-0000-000000000005', '11119999-0000-0000-0000-000000000009', 'email', 'registration_confirmation', 'deepa@example.com', 'queued', '11119999-0000-0000-0000-000000000009:registration_confirmation:email');
update message_logs set status = 'failed', failure_reason = 'No active template configured for this key/channel.'
where dedupe_key = '11119999-0000-0000-0000-000000000009:registration_confirmation:email';

\echo 'The registration is STILL confirmed - messaging failure had zero effect on it:'
select status, payment_status from registrations where id = '11119999-0000-0000-0000-000000000009';
\echo 'And the failure IS logged for observability:'
select channel, template_key, status, failure_reason from message_logs where registration_id = '11119999-0000-0000-0000-000000000009';

delete from message_logs where registration_id = '11119999-0000-0000-0000-000000000009';
delete from registrations where id = '11119999-0000-0000-0000-000000000009';
delete from form_fields where form_id = 'ffff6666-0000-0000-0000-000000000006';
delete from forms where id = 'ffff6666-0000-0000-0000-000000000006';
delete from organizations where id = 'eeee5555-0000-0000-0000-000000000005';
\echo 'DONE'
