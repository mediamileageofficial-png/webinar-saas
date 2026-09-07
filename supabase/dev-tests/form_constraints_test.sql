insert into auth.users (id, email) values ('aaaaaaaa-1111-1111-1111-111111111111', 'owner-h@example.com');
insert into organizations (id, name, slug) values ('bbbbbbbb-1111-1111-1111-111111111111', 'Org H', 'org-h');
insert into organization_members (organization_id, user_id, role) values
  ('bbbbbbbb-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'organization_owner');

set role app_authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-1111-1111-1111-111111111111', false);

\echo 'Insert PAID form with NO price (expect CHECK constraint ERROR):'
insert into forms (organization_id, name, public_slug, is_paid)
values ('bbbbbbbb-1111-1111-1111-111111111111', 'Bad Paid Form', 'bad-paid-form', true);

\echo 'Insert PAID form WITH price (expect success):'
insert into forms (organization_id, name, public_slug, is_paid, price_amount)
values ('bbbbbbbb-1111-1111-1111-111111111111', 'Good Paid Form', 'good-paid-form', true, 499);
select name, is_paid, price_amount from forms where public_slug = 'good-paid-form';

\echo 'Insert a SECOND form reusing the same public_slug (expect UNIQUE constraint ERROR):'
insert into forms (organization_id, name, public_slug)
values ('bbbbbbbb-1111-1111-1111-111111111111', 'Duplicate Slug Form', 'good-paid-form');

\echo 'Add two fields with the SAME field_key on the SAME form (expect UNIQUE constraint ERROR on the second):'
insert into form_fields (organization_id, form_id, field_type, field_key, label)
select 'bbbbbbbb-1111-1111-1111-111111111111', id, 'email', 'email', 'Email'
from forms where public_slug = 'good-paid-form';
insert into form_fields (organization_id, form_id, field_type, field_key, label)
select 'bbbbbbbb-1111-1111-1111-111111111111', id, 'text', 'email', 'Email again'
from forms where public_slug = 'good-paid-form';

reset role;
delete from form_fields where form_id in (select id from forms where organization_id = 'bbbbbbbb-1111-1111-1111-111111111111');
delete from forms where organization_id = 'bbbbbbbb-1111-1111-1111-111111111111';
delete from organization_members where organization_id = 'bbbbbbbb-1111-1111-1111-111111111111';
delete from organizations where id = 'bbbbbbbb-1111-1111-1111-111111111111';
delete from auth.users where id = 'aaaaaaaa-1111-1111-1111-111111111111';
\echo 'DONE'
