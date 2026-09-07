insert into organizations (id, name, slug) values ('aaaa1111-0000-0000-0000-000000000001', 'Org M', 'org-m');
insert into registrations (id, organization_id, form_id, email, status, dedupe_key)
select 'bbbb2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', id, 'reg@example.com', 'confirmed', 'x'
from forms limit 0; -- placeholder, form_id not needed for this test; insert without it instead:

-- Simpler: message_logs.registration_id has no FK NOT NULL requirement blocking test; but FK exists to registrations.
-- Create a minimal form + registration to satisfy FKs.
insert into forms (id, organization_id, name, public_slug) values
  ('cccc3333-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000001', 'Form M', 'form-m');
insert into registrations (id, organization_id, form_id, email, status, dedupe_key) values
  ('bbbb2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 'cccc3333-0000-0000-0000-000000000003', 'reg@example.com', 'confirmed', 'dk-1');

\echo 'First "send" reserves the log row (expect success):'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('aaaa1111-0000-0000-0000-000000000001', 'bbbb2222-0000-0000-0000-000000000002', 'email', 'registration_confirmation', 'reg@example.com', 'queued', 'bbbb2222-0000-0000-0000-000000000002:registration_confirmation:email');

\echo 'A concurrent/duplicate attempt to send the SAME template+channel to the SAME registration (expect UNIQUE constraint ERROR - this is what the app treats as a safe no-op):'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('aaaa1111-0000-0000-0000-000000000001', 'bbbb2222-0000-0000-0000-000000000002', 'email', 'registration_confirmation', 'reg@example.com', 'queued', 'bbbb2222-0000-0000-0000-000000000002:registration_confirmation:email');

\echo 'A DIFFERENT channel for the same registration+template IS allowed (expect success):'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('aaaa1111-0000-0000-0000-000000000001', 'bbbb2222-0000-0000-0000-000000000002', 'sms', 'registration_confirmation', '9999999999', 'queued', 'bbbb2222-0000-0000-0000-000000000002:registration_confirmation:sms');

select channel, template_key, status from message_logs where registration_id = 'bbbb2222-0000-0000-0000-000000000002' order by channel;

delete from message_logs where registration_id = 'bbbb2222-0000-0000-0000-000000000002';
delete from registrations where id = 'bbbb2222-0000-0000-0000-000000000002';
delete from forms where id = 'cccc3333-0000-0000-0000-000000000003';
delete from organizations where id = 'aaaa1111-0000-0000-0000-000000000001';
\echo 'DONE'
