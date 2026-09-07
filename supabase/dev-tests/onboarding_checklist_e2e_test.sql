insert into organizations (id, name, slug) values ('55550002-0000-0000-0000-000000005550', 'New Academy', 'new-academy-checklist');

\echo '=== Step 0: brand new org, expect ALL steps incomplete except payment (no paid form yet, so N/A) ==='
select
  (contact_email is not null) as profile_done
from organizations where id = '55550002-0000-0000-0000-000000005550';
select count(*) as webinar_count from webinars where organization_id = '55550002-0000-0000-0000-000000005550';
select count(*) as form_count from forms where organization_id = '55550002-0000-0000-0000-000000005550';
select
  (not exists(select 1 from forms where organization_id = '55550002-0000-0000-0000-000000005550' and is_paid)) as payment_step_complete;

\echo '=== Step 1: complete profile ==='
update organizations set contact_email = 'hello@newacademy.example' where id = '55550002-0000-0000-0000-000000005550';
select (contact_email is not null) as profile_done from organizations where id = '55550002-0000-0000-0000-000000005550';

\echo '=== Step 2: create first webinar ==='
insert into webinars (id, organization_id, name, event_date, start_time, end_time) values
  ('66660003-0000-0000-0000-000000006660', '55550002-0000-0000-0000-000000005550', 'Kickoff Webinar', '2026-11-01', '2026-11-01 10:00:00+00', '2026-11-01 11:00:00+00');
select count(*) as webinar_count from webinars where organization_id = '55550002-0000-0000-0000-000000005550';

\echo '=== Step 3: create first form (PAID this time, to test the payment-gating logic) ==='
insert into forms (id, organization_id, name, public_slug, is_paid, price_amount) values
  ('77770004-0000-0000-0000-000000007770', '55550002-0000-0000-0000-000000005550', 'Kickoff Form', 'kickoff-form-checklist', true, 499);
select count(*) as form_count from forms where organization_id = '55550002-0000-0000-0000-000000005550';
\echo 'Now that a PAID form exists, payment step should flip to INCOMPLETE until Cashfree is configured:'
select
  (not exists(select 1 from forms where organization_id = '55550002-0000-0000-0000-000000005550' and is_paid)) as no_paid_form,
  exists(select 1 from organization_credentials where organization_id = '55550002-0000-0000-0000-000000005550' and provider = 'cashfree') as cashfree_configured;

\echo '=== Step 4: configure Cashfree - payment step should now be complete ==='
insert into organization_credentials (organization_id, provider, credentials) values
  ('55550002-0000-0000-0000-000000005550', 'cashfree', '{"appId":"x","secretKey":"y","webhookSecret":"z","env":"sandbox"}');
select exists(select 1 from organization_credentials where organization_id = '55550002-0000-0000-0000-000000005550' and provider = 'cashfree') as cashfree_configured;

\echo '=== Step 5: configure MSG91 ==='
insert into organization_credentials (organization_id, provider, credentials) values
  ('55550002-0000-0000-0000-000000005550', 'msg91', '{"authKey":"x"}');
select exists(select 1 from organization_credentials where organization_id = '55550002-0000-0000-0000-000000005550' and provider = 'msg91') as msg91_configured;

\echo '=== Step 6: publish the form - ALL 6 steps now complete ==='
update forms set is_published = true where id = '77770004-0000-0000-0000-000000007770';
select bool_and(is_published) as all_forms_published from forms where organization_id = '55550002-0000-0000-0000-000000005550';

delete from organization_credentials where organization_id = '55550002-0000-0000-0000-000000005550';
delete from forms where organization_id = '55550002-0000-0000-0000-000000005550';
delete from webinars where organization_id = '55550002-0000-0000-0000-000000005550';
delete from organizations where id = '55550002-0000-0000-0000-000000005550';
\echo 'DONE'
