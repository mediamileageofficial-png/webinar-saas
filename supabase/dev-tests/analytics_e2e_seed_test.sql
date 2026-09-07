-- Seed data matching the plan's own example (Section 17):
-- "Meta Ads -> campaign ABC -> webinar form -> registration"

insert into organizations (id, name, slug) values ('88880000-0000-0000-0000-000000000888', 'Org W', 'org-w');
insert into forms (id, organization_id, name, public_slug, view_count) values
  ('99990000-0000-0000-0000-000000000999', '88880000-0000-0000-0000-000000000888', 'Webinar Signup Form', 'webinar-signup-form-w', 20);
insert into webinars (id, organization_id, name, event_date, start_time, end_time, status) values
  ('aaaa0000-0000-0000-0000-00000000aaaa', '88880000-0000-0000-0000-000000000888', 'Growth Masterclass',
   '2026-09-15', '2026-09-15 10:00:00+00', '2026-09-15 11:00:00+00', 'completed');

insert into registrations (id, organization_id, form_id, webinar_id, email, status, payment_status, utm_source, utm_campaign, dedupe_key) values
  ('bbbb0000-0000-0000-0000-00000000bb01', '88880000-0000-0000-0000-000000000888', '99990000-0000-0000-0000-000000000999', 'aaaa0000-0000-0000-0000-00000000aaaa', 'p1@x.com', 'confirmed', 'success', 'meta', 'ABC', 'dk-w-1'),
  ('bbbb0000-0000-0000-0000-00000000bb02', '88880000-0000-0000-0000-000000000888', '99990000-0000-0000-0000-000000000999', 'aaaa0000-0000-0000-0000-00000000aaaa', 'p2@x.com', 'confirmed', 'success', 'meta', 'ABC', 'dk-w-2'),
  ('bbbb0000-0000-0000-0000-00000000bb03', '88880000-0000-0000-0000-000000000888', '99990000-0000-0000-0000-000000000999', 'aaaa0000-0000-0000-0000-00000000aaaa', 'p3@x.com', 'pending', 'not_applicable', 'google', 'search-q4', 'dk-w-3'),
  ('bbbb0000-0000-0000-0000-00000000bb04', '88880000-0000-0000-0000-000000000888', '99990000-0000-0000-0000-000000000999', 'aaaa0000-0000-0000-0000-00000000aaaa', 'p4@x.com', 'confirmed', 'not_applicable', null, null, 'dk-w-4');

insert into attendance (organization_id, registration_id, webinar_id, attended) values
  ('88880000-0000-0000-0000-000000000888', 'bbbb0000-0000-0000-0000-00000000bb01', 'aaaa0000-0000-0000-0000-00000000aaaa', true),
  ('88880000-0000-0000-0000-000000000888', 'bbbb0000-0000-0000-0000-00000000bb02', 'aaaa0000-0000-0000-0000-00000000aaaa', false);

insert into payments (organization_id, registration_id, provider, provider_order_id, amount, currency, status, idempotency_key) values
  ('88880000-0000-0000-0000-000000000888', 'bbbb0000-0000-0000-0000-00000000bb01', 'cashfree', 'order-w-1', 999, 'INR', 'success', 'idem-w-1'),
  ('88880000-0000-0000-0000-000000000888', 'bbbb0000-0000-0000-0000-00000000bb02', 'cashfree', 'order-w-2', 999, 'INR', 'success', 'idem-w-2');

\echo '=== Replicating the analytics page queries exactly ==='
\echo '--- Registrations by source (expect meta=2, google=1, Direct/Unknown=1) ---'
select coalesce(utm_source, 'Direct / Unknown') as source, count(*) from registrations
where organization_id = '88880000-0000-0000-0000-000000000888' group by 1 order by 2 desc;

\echo '--- Registrations by campaign (expect ABC=2, search-q4=1, Direct/Unknown=1) ---'
select coalesce(utm_campaign, 'Direct / Unknown') as campaign, count(*) from registrations
where organization_id = '88880000-0000-0000-0000-000000000888' group by 1 order by 2 desc;

\echo '--- Paid registrations by source (expect meta=2) ---'
select coalesce(utm_source, 'Direct / Unknown') as source, count(*) from registrations
where organization_id = '88880000-0000-0000-0000-000000000888' and payment_status = 'success' group by 1 order by 2 desc;

\echo '--- Attendance by source (expect meta=1, since only bb01 attended and bb01 is meta) ---'
select coalesce(r.utm_source, 'Direct / Unknown') as source, count(*) from attendance a
join registrations r on r.id = a.registration_id
where a.organization_id = '88880000-0000-0000-0000-000000000888' and a.attended = true
group by 1 order by 2 desc;

\echo '--- Webinar-level stats: total=4, confirmed=3, payment_success=2, attended=1, no_show=1, revenue=1998 ---'
select
  count(*) as total,
  count(*) filter (where status = 'confirmed') as confirmed,
  count(*) filter (where payment_status = 'success') as payment_success
from registrations where webinar_id = 'aaaa0000-0000-0000-0000-00000000aaaa';
select count(*) filter (where attended) as attended, count(*) filter (where not attended) as no_show
from attendance where webinar_id = 'aaaa0000-0000-0000-0000-00000000aaaa';
select sum(amount) as revenue from payments where registration_id in (
  select id from registrations where webinar_id = 'aaaa0000-0000-0000-0000-00000000aaaa'
) and status = 'success';

\echo '--- Form-level: views=20, submissions=4, conversion=4/20=20.0% ---'
select view_count from forms where id = '99990000-0000-0000-0000-000000000999';
select count(*) as submissions from registrations where form_id = '99990000-0000-0000-0000-000000000999';

delete from payments where organization_id = '88880000-0000-0000-0000-000000000888';
delete from attendance where organization_id = '88880000-0000-0000-0000-000000000888';
delete from registrations where organization_id = '88880000-0000-0000-0000-000000000888';
delete from webinars where id = 'aaaa0000-0000-0000-0000-00000000aaaa';
delete from forms where id = '99990000-0000-0000-0000-000000000999';
delete from organizations where id = '88880000-0000-0000-0000-000000000888';
\echo 'DONE'
