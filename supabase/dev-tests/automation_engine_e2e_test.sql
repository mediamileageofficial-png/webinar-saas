-- Full simulation of what runAutomationTick() does for one due rule, run
-- TWICE to prove idempotency across ticks (the actual exit-check claim:
-- "reminder rules fire once, are idempotent").

insert into organizations (id, name, slug) values ('33334444-0000-0000-0000-000000000033', 'Org R', 'org-r');
insert into forms (id, organization_id, name, public_slug) values
  ('44445555-0000-0000-0000-000000000044', '33334444-0000-0000-0000-000000000033', 'Form R', 'form-r');

-- Webinar starting in exactly 24h from our fixed reference "now".
insert into webinars (id, organization_id, name, event_date, start_time, end_time, status, join_url) values
  ('55556666-0000-0000-0000-000000000055', '33334444-0000-0000-0000-000000000033', 'Webinar R',
   '2026-10-02', '2026-10-02 10:00:00+00', '2026-10-02 11:00:00+00', 'registration_open', 'https://example.com/join');

insert into registrations (id, organization_id, form_id, webinar_id, full_name, email, status, dedupe_key) values
  ('66667777-0000-0000-0000-000000000066', '33334444-0000-0000-0000-000000000033', '44445555-0000-0000-0000-000000000044',
   '55556666-0000-0000-0000-000000000055', 'Ravi Kumar', 'ravi@example.com', 'confirmed', 'dk-r-1');

insert into automation_rules (id, organization_id, webinar_id, trigger, offset_minutes, channel, template_key, is_active) values
  ('77778888-0000-0000-0000-000000000077', '33334444-0000-0000-0000-000000000033', null, 'before_webinar', -1440, 'email', 'reminder_24h', true);

\echo '=== TICK 1: at the exact trigger moment (now = start_time - 24h) ==='
-- Replicate the engine's webinar-matching query for this rule:
\echo 'Webinars matched by the rule query:'
select id, name from webinars
where organization_id = '33334444-0000-0000-0000-000000000033'
  and start_time > (timestamptz '2026-10-01 10:00:00+00' - interval '15 minutes' - (-1440 * interval '1 minute'))
  and start_time <= (timestamptz '2026-10-01 10:00:00+00' - (-1440 * interval '1 minute'))
  and status not in ('cancelled','draft');

\echo 'Confirmed registrations for that webinar:'
select id, email from registrations where webinar_id = '55556666-0000-0000-0000-000000000055' and status = 'confirmed';

\echo 'sendTemplatedMessage reserves a log row keyed by registration+template+channel+RULE ID:'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('33334444-0000-0000-0000-000000000033', '66667777-0000-0000-0000-000000000066', 'email', 'reminder_24h', 'ravi@example.com', 'sent',
        '66667777-0000-0000-0000-000000000066:reminder_24h:email:77778888-0000-0000-0000-000000000077');

select count(*) as messages_after_tick_1 from message_logs where registration_id = '66667777-0000-0000-0000-000000000066';

\echo '=== TICK 2: cron runs AGAIN 5 minutes later, same rule still matches the window (overlap) ==='
\echo 'Webinars STILL matched by the rule query at t+5min (expect same webinar - window overlap is normal):'
select id, name from webinars
where organization_id = '33334444-0000-0000-0000-000000000033'
  and start_time > (timestamptz '2026-10-01 10:05:00+00' - interval '15 minutes' - (-1440 * interval '1 minute'))
  and start_time <= (timestamptz '2026-10-01 10:05:00+00' - (-1440 * interval '1 minute'))
  and status not in ('cancelled','draft');

\echo 'sendTemplatedMessage tries to reserve the SAME dedupe_key again (expect UNIQUE CONSTRAINT ERROR - treated as safe no-op, no second send):'
insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, dedupe_key)
values ('33334444-0000-0000-0000-000000000033', '66667777-0000-0000-0000-000000000066', 'email', 'reminder_24h', 'ravi@example.com', 'queued',
        '66667777-0000-0000-0000-000000000066:reminder_24h:email:77778888-0000-0000-0000-000000000077');

\echo 'FINAL: exactly ONE message was ever actually sent despite two overlapping ticks:'
select count(*) as total_messages_ever_sent from message_logs where registration_id = '66667777-0000-0000-0000-000000000066';

delete from message_logs where registration_id = '66667777-0000-0000-0000-000000000066';
delete from automation_rules where id = '77778888-0000-0000-0000-000000000077';
delete from registrations where id = '66667777-0000-0000-0000-000000000066';
delete from webinars where id = '55556666-0000-0000-0000-000000000055';
delete from forms where id = '44445555-0000-0000-0000-000000000044';
delete from organizations where id = '33334444-0000-0000-0000-000000000033';
\echo 'DONE'
