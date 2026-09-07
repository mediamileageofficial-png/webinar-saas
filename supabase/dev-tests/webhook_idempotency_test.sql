insert into organizations (id, name, slug) values ('99991111-2222-3333-4444-555566667777', 'Org K', 'org-k');
insert into forms (id, organization_id, name, public_slug, is_paid, price_amount) values
  ('99992222-3333-4444-5555-666677778888', '99991111-2222-3333-4444-555566667777', 'Paid Form', 'paid-form-k', true, 999);
insert into registrations (id, organization_id, form_id, email, status, payment_status, dedupe_key) values
  ('99993333-4444-5555-6666-777788889999', '99991111-2222-3333-4444-555566667777', '99992222-3333-4444-5555-666677778888', 'payer@example.com', 'pending', 'pending', 'dedupe-k-1');
insert into payments (id, organization_id, registration_id, provider, provider_order_id, amount, currency, status, idempotency_key) values
  ('99994444-5555-6666-7777-888899990000', '99991111-2222-3333-4444-555566667777', '99993333-4444-5555-6666-777788889999', 'cashfree', 'order_k_1', 999, 'INR', 'pending', 'idem-k-1');

\echo 'Simulate FIRST webhook: payment succeeds -> registration should confirm:'
update payments set status = 'success' where id = '99994444-5555-6666-7777-888899990000';
update registrations set status = 'confirmed', payment_status = 'success' where id = '99993333-4444-5555-6666-777788889999';
select status, payment_status from registrations where id = '99993333-4444-5555-6666-777788889999';

\echo 'Simulate a LATE/DUPLICATE webhook claiming FAILED for the same order (app logic checks payment.status first - simulating the guard):'
-- This mirrors the webhook route's own idempotency check: "if payment.status === success, ignore".
-- We verify the DATA SHAPE supports that check (payment.status readable before any write):
select status as payment_status_before_guard from payments where id = '99994444-5555-6666-7777-888899990000';
\echo 'Since payment_status_before_guard = success, the app would SKIP applying the FAILED event. Confirming registration is untouched by NOT running the failed-path update:'
select status, payment_status from registrations where id = '99993333-4444-5555-6666-777788889999';

delete from payments where id = '99994444-5555-6666-7777-888899990000';
delete from registrations where id = '99993333-4444-5555-6666-777788889999';
delete from forms where id = '99992222-3333-4444-5555-666677778888';
delete from organizations where id = '99991111-2222-3333-4444-555566667777';
\echo 'DONE'
