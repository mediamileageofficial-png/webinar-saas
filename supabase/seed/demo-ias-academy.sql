-- ============================================================================
-- demo-ias-academy.sql
--
-- Full demo dataset for "Demo IAS Academy": 2 webinars, 3 forms, 20
-- registrations, payment examples, message logs, and attendance examples -
-- per the plan's Phase 15 requirements.
--
-- IDEMPOTENT: safe to re-run. It deletes any existing rows for this specific
-- demo organization_id first (children before parents, respecting FKs), then
-- re-inserts everything fresh. This is DEMO DATA ONLY and must never be run
-- against a database containing real tenant data with this same org id.
--
-- All IDs use a fixed, clearly-artificial UUID scheme so they're easy to
-- recognize and never collide with real gen_random_uuid() values:
--   org:            00000000-0000-0000-0000-0000000000d1
--   webinars:       a0000000-...-000000000001 / ...002
--   forms:          b0000000-...-000000000001 / 002 / 003
--   form_fields:    c0000000-...-0000000000NN
--   registrations:  d0000000-...-0000000000NN  (01-20)
--   payments:       e0000000-...-0000000000NN
--   message_logs:   f0000000-...-0000000000NN
--
-- NOTE: the owner's auth.users row is created by Supabase Auth on signup,
-- not here. After creating a real user via Supabase Auth, link them with:
--   insert into organization_members (organization_id, user_id, role)
--   values ('00000000-0000-0000-0000-0000000000d1', '<real-auth-user-id>', 'organization_owner');
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Clean slate for this demo org only (idempotent re-run)
-- ----------------------------------------------------------------------------
delete from message_logs where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from attendance where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from payments where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from registration_values where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from registrations where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from form_fields where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from automation_rules where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from message_templates where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from forms where organization_id = '00000000-0000-0000-0000-0000000000d1';
delete from webinars where organization_id = '00000000-0000-0000-0000-0000000000d1';

insert into organizations (id, name, slug, contact_email, timezone)
values (
  '00000000-0000-0000-0000-0000000000d1',
  'Demo IAS Academy',
  'demo-ias-academy',
  'hello@demoiasacademy.example',
  'Asia/Kolkata'
)
on conflict (id) do update set
  name = excluded.name,
  contact_email = excluded.contact_email,
  timezone = excluded.timezone;

-- ----------------------------------------------------------------------------
-- Webinars: one upcoming (registration open), one already completed (so
-- attendance/analytics have something real to show).
-- ----------------------------------------------------------------------------
insert into webinars (id, organization_id, name, description, event_date, start_time, end_time, timezone, speaker_name, platform, join_url, status)
values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1',
   'UPSC Prelims Strategy Session', 'A live strategy session covering the UPSC Prelims syllabus and time management.',
   current_date + interval '10 days', now() + interval '10 days', now() + interval '10 days' + interval '90 minutes',
   'Asia/Kolkata', 'Dr. Anjali Mehta', 'Zoom', 'https://zoom.example.com/demo-prelims', 'registration_open'),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1',
   'Mains Answer Writing Masterclass', 'A paid masterclass on structuring high-scoring UPSC Mains answers.',
   current_date - interval '5 days', now() - interval '5 days', now() - interval '5 days' + interval '2 hours',
   'Asia/Kolkata', 'Rajeev Nair', 'Google Meet', 'https://meet.example.com/demo-mains', 'completed');

-- ----------------------------------------------------------------------------
-- Forms: one free (linked to the upcoming webinar), one paid (linked to the
-- completed webinar - to seed realistic payment/attendance history), and one
-- free-standing form not tied to any webinar (a generic inquiry form,
-- demonstrating the platform isn't webinar-only).
-- ----------------------------------------------------------------------------
insert into forms (id, organization_id, webinar_id, name, description, public_slug, is_published, submit_button_text, is_paid, price_amount, currency, view_count)
values
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000001',
   'Prelims Strategy Session - Free Registration', 'Register for the free strategy session.', 'prelims-strategy-session',
   true, 'Register Free', false, null, 'INR', 84),
  ('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'a0000000-0000-0000-0000-000000000002',
   'Mains Answer Writing Masterclass - Paid Registration', 'Register (paid) for the answer writing masterclass.', 'mains-answer-writing-masterclass',
   true, 'Pay & Register', true, 499, 'INR', 156),
  ('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d1', null,
   'Career Counselling Inquiry', 'Not tied to a specific webinar - a general lead capture form.', 'career-counselling-inquiry',
   true, 'Submit Inquiry', false, null, 'INR', 32);

insert into form_fields (id, organization_id, form_id, field_type, field_key, label, is_required, sort_order, options)
values
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'full_name', 'full_name', 'Full name', true, 0, null),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'email', 'email', 'Email', true, 1, null),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'mobile', 'mobile', 'Mobile', true, 2, null),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'full_name', 'full_name', 'Full name', true, 0, null),
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'email', 'email', 'Email', true, 1, null),
  ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'mobile', 'mobile', 'Mobile', true, 2, null),
  ('c0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'dropdown', 'attempt_number', 'Which attempt is this?', false, 3, '["1st","2nd","3rd","4th or more"]'),
  ('c0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'consent', 'consent', 'I agree to be contacted about this masterclass', true, 4, null),
  ('c0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', 'full_name', 'full_name', 'Full name', true, 0, null),
  ('c0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', 'email', 'email', 'Email', true, 1, null),
  ('c0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', 'textarea', 'message', 'What are you looking for guidance on?', false, 2, null);

-- ----------------------------------------------------------------------------
-- Registrations: 20 total.
--   - 8 for the free strategy session (webinar 1 / form 1): all confirmed,
--     varied UTM sources and created_at dates for analytics/dashboard demos.
--   - 8 for the paid masterclass (webinar 2 / form 2): mixed payment
--     outcomes (success/pending/failed), matching the payment state machine.
--   - 4 for the standalone inquiry form (form 3, no webinar): free, confirmed.
-- ----------------------------------------------------------------------------
insert into registrations (id, organization_id, form_id, webinar_id, full_name, email, mobile, status, payment_status, utm_source, utm_campaign, referrer, created_at, dedupe_key)
values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Priya Sharma', 'priya.sharma@example.com', '9810000001', 'confirmed', 'not_applicable', 'meta', 'prelims-launch', 'https://facebook.com', now() - interval '6 days', 'demo-dk-01'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Rahul Verma', 'rahul.verma@example.com', '9810000002', 'confirmed', 'not_applicable', 'meta', 'prelims-launch', 'https://facebook.com', now() - interval '5 days', 'demo-dk-02'),
  ('d0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Sneha Iyer', 'sneha.iyer@example.com', '9810000003', 'confirmed', 'not_applicable', 'google', 'search-upsc', 'https://google.com', now() - interval '4 days', 'demo-dk-03'),
  ('d0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Karan Singh', 'karan.singh@example.com', '9810000004', 'confirmed', 'not_applicable', 'google', 'search-upsc', 'https://google.com', now() - interval '3 days', 'demo-dk-04'),
  ('d0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Anita Desai', 'anita.desai@example.com', '9810000005', 'confirmed', 'not_applicable', null, null, null, now() - interval '2 days', 'demo-dk-05'),
  ('d0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Vikram Rao', 'vikram.rao@example.com', '9810000006', 'confirmed', 'not_applicable', null, null, null, now() - interval '1 days', 'demo-dk-06'),
  ('d0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Meera Nair', 'meera.nair@example.com', '9810000007', 'confirmed', 'not_applicable', 'meta', 'prelims-launch', 'https://facebook.com', now(), 'demo-dk-07'),
  ('d0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Arjun Kapoor', 'arjun.kapoor@example.com', '9810000008', 'confirmed', 'not_applicable', 'google', 'search-upsc', 'https://google.com', now(), 'demo-dk-08'),

  ('d0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Divya Menon', 'divya.menon@example.com', '9820000001', 'confirmed', 'success', 'meta', 'mains-masterclass', 'https://facebook.com', now() - interval '9 days', 'demo-dk-09'),
  ('d0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Suresh Pillai', 'suresh.pillai@example.com', '9820000002', 'confirmed', 'success', 'meta', 'mains-masterclass', 'https://facebook.com', now() - interval '8 days', 'demo-dk-10'),
  ('d0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Neha Gupta', 'neha.gupta@example.com', '9820000003', 'confirmed', 'success', 'google', 'search-mains', 'https://google.com', now() - interval '8 days', 'demo-dk-11'),
  ('d0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Manoj Tiwari', 'manoj.tiwari@example.com', '9820000004', 'confirmed', 'success', 'google', 'search-mains', 'https://google.com', now() - interval '7 days', 'demo-dk-12'),
  ('d0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Pooja Reddy', 'pooja.reddy@example.com', '9820000005', 'confirmed', 'success', null, null, null, now() - interval '7 days', 'demo-dk-13'),
  ('d0000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Amit Joshi', 'amit.joshi@example.com', '9820000006', 'pending', 'pending', 'meta', 'mains-masterclass', 'https://facebook.com', now() - interval '6 days', 'demo-dk-14'),
  ('d0000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Kavita Bhat', 'kavita.bhat@example.com', '9820000007', 'pending', 'failed', 'google', 'search-mains', 'https://google.com', now() - interval '6 days', 'demo-dk-15'),
  ('d0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Rohit Malhotra', 'rohit.malhotra@example.com', '9820000008', 'pending', 'failed', null, null, null, now() - interval '5 days', 'demo-dk-16'),

  ('d0000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', null, 'Ritu Chawla', 'ritu.chawla@example.com', null, 'confirmed', 'not_applicable', 'google', 'career-guidance', 'https://google.com', now() - interval '3 days', 'demo-dk-17'),
  ('d0000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', null, 'Deepak Kumar', 'deepak.kumar@example.com', null, 'confirmed', 'not_applicable', null, null, null, now() - interval '2 days', 'demo-dk-18'),
  ('d0000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', null, 'Shalini Roy', 'shalini.roy@example.com', null, 'confirmed', 'not_applicable', 'meta', 'career-guidance', 'https://facebook.com', now() - interval '1 days', 'demo-dk-19'),
  ('d0000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000d1', 'b0000000-0000-0000-0000-000000000003', null, 'Gaurav Sethi', 'gaurav.sethi@example.com', null, 'confirmed', 'not_applicable', 'google', 'career-guidance', 'https://google.com', now(), 'demo-dk-20');

-- ----------------------------------------------------------------------------
-- Payments: one row per masterclass registration, matching its payment_status.
-- ----------------------------------------------------------------------------
insert into payments (id, organization_id, registration_id, provider, provider_order_id, amount, currency, status, idempotency_key, created_at)
values
  ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000009', 'cashfree', 'demo-order-09', 499, 'INR', 'success', 'demo-idem-09', now() - interval '9 days'),
  ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000a', 'cashfree', 'demo-order-0a', 499, 'INR', 'success', 'demo-idem-0a', now() - interval '8 days'),
  ('e0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000b', 'cashfree', 'demo-order-0b', 499, 'INR', 'success', 'demo-idem-0b', now() - interval '8 days'),
  ('e0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000c', 'cashfree', 'demo-order-0c', 499, 'INR', 'success', 'demo-idem-0c', now() - interval '7 days'),
  ('e0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000d', 'cashfree', 'demo-order-0d', 499, 'INR', 'success', 'demo-idem-0d', now() - interval '7 days'),
  ('e0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000e', 'cashfree', 'demo-order-0e', 499, 'INR', 'pending', 'demo-idem-0e', now() - interval '6 days'),
  ('e0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000f', 'cashfree', 'demo-order-0f', 499, 'INR', 'failed', 'demo-idem-0f', now() - interval '6 days'),
  ('e0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000010', 'cashfree', 'demo-order-10', 499, 'INR', 'failed', 'demo-idem-10', now() - interval '5 days');

-- ----------------------------------------------------------------------------
-- Attendance: webinar 2 already happened - mark most paid/confirmed
-- registrants as attended, one as no-show.
-- ----------------------------------------------------------------------------
insert into attendance (organization_id, registration_id, webinar_id, attended, marked_at)
values
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', true, now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000002', true, now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000002', true, now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000002', false, now() - interval '5 days'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000002', true, now() - interval '5 days');

-- ----------------------------------------------------------------------------
-- Default message templates (same defaults create_organization_with_owner()
-- seeds for real signups) plus a few message_logs showing sent/failed history.
-- ----------------------------------------------------------------------------
insert into message_templates (organization_id, key, channel, version, subject, body, is_active)
values
  ('00000000-0000-0000-0000-0000000000d1', 'registration_confirmation', 'email', 1,
   'You''re registered for {{webinar_name}}',
   '<p>Hi {{name}},</p><p>You''re confirmed for <strong>{{webinar_name}}</strong> on {{date}} at {{time}}.</p><p><a href="{{join_link}}">Join here</a></p>',
   true),
  ('00000000-0000-0000-0000-0000000000d1', 'payment_confirmation', 'email', 1,
   'Payment received - {{webinar_name}}',
   '<p>Hi {{name}},</p><p>We''ve received your payment of {{amount}} for <strong>{{webinar_name}}</strong>.</p>',
   true);

insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, sent_at, dedupe_key)
values
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000001', 'email', 'registration_confirmation', 'priya.sharma@example.com', 'sent', now() - interval '6 days', 'demo-msg-01'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000002', 'email', 'registration_confirmation', 'rahul.verma@example.com', 'sent', now() - interval '5 days', 'demo-msg-02'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000009', 'email', 'payment_confirmation', 'divya.menon@example.com', 'sent', now() - interval '9 days', 'demo-msg-03'),
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-00000000000a', 'email', 'payment_confirmation', 'suresh.pillai@example.com', 'sent', now() - interval '8 days', 'demo-msg-04');

insert into message_logs (organization_id, registration_id, channel, template_key, recipient, status, failure_reason, dedupe_key)
values
  ('00000000-0000-0000-0000-0000000000d1', 'd0000000-0000-0000-0000-000000000009', 'sms', 'registration_confirmation', '9820000001', 'failed', 'Template has no MSG91 template id configured.', 'demo-msg-05');
