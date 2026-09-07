insert into organizations (id, name, slug) values ('11112222-3333-4444-5555-666677778888', 'Org J', 'org-j');
insert into forms (id, organization_id, name, public_slug) values
  ('22223333-4444-5555-6666-777788889999', '11112222-3333-4444-5555-666677778888', 'No-Email Form', 'no-email-form');

\echo 'Two DIFFERENT people submit a form with no email/mobile field - both use random dedupe keys - expect BOTH succeed:'
insert into registrations (organization_id, form_id, full_name, status, dedupe_key)
values ('11112222-3333-4444-5555-666677778888', '22223333-4444-5555-6666-777788889999', 'Alice', 'confirmed', gen_random_uuid()::text);
insert into registrations (organization_id, form_id, full_name, status, dedupe_key)
values ('11112222-3333-4444-5555-666677778888', '22223333-4444-5555-6666-777788889999', 'Bob', 'confirmed', gen_random_uuid()::text);
select full_name from registrations where form_id = '22223333-4444-5555-6666-777788889999' order by full_name;

\echo 'The SAME person submits an email-based form TWICE with the same dedupe key - expect the SECOND to fail:'
insert into registrations (organization_id, form_id, email, status, dedupe_key)
values ('11112222-3333-4444-5555-666677778888', '22223333-4444-5555-6666-777788889999', 'carol@example.com', 'confirmed', encode(sha256('carol@example.com'::bytea), 'hex'));
insert into registrations (organization_id, form_id, email, status, dedupe_key)
values ('11112222-3333-4444-5555-666677778888', '22223333-4444-5555-6666-777788889999', 'carol@example.com', 'confirmed', encode(sha256('carol@example.com'::bytea), 'hex'));

delete from registrations where form_id = '22223333-4444-5555-6666-777788889999';
delete from forms where id = '22223333-4444-5555-6666-777788889999';
delete from organizations where id = '11112222-3333-4444-5555-666677778888';
\echo 'DONE'
