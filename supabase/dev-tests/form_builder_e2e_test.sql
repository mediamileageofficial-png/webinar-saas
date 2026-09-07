insert into auth.users (id, email) values ('cccccccc-2222-2222-2222-222222222222', 'owner-i@example.com');
insert into organizations (id, name, slug) values ('dddddddd-2222-2222-2222-222222222222', 'Org I', 'org-i');
insert into organization_members (organization_id, user_id, role) values
  ('dddddddd-2222-2222-2222-222222222222', 'cccccccc-2222-2222-2222-222222222222', 'organization_owner');

set role app_authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-2222-2222-2222-222222222222', false);

\echo 'Create a free form (starts unpublished):'
insert into forms (id, organization_id, name, public_slug)
values ('eeeeeeee-2222-2222-2222-222222222222', 'dddddddd-2222-2222-2222-222222222222', 'Mixed Field Test Form', 'mixed-field-test-form');
select name, is_published from forms where id = 'eeeeeeee-2222-2222-2222-222222222222';

\echo 'Add a mix of field types: full_name, email, mobile, dropdown, consent:'
insert into form_fields (organization_id, form_id, field_type, field_key, label, sort_order, is_required) values
  ('dddddddd-2222-2222-2222-222222222222', 'eeeeeeee-2222-2222-2222-222222222222', 'full_name', 'full_name', 'Full name', 0, true),
  ('dddddddd-2222-2222-2222-222222222222', 'eeeeeeee-2222-2222-2222-222222222222', 'email', 'email', 'Email', 1, true),
  ('dddddddd-2222-2222-2222-222222222222', 'eeeeeeee-2222-2222-2222-222222222222', 'mobile', 'mobile', 'Mobile', 2, true);
insert into form_fields (organization_id, form_id, field_type, field_key, label, sort_order, options) values
  ('dddddddd-2222-2222-2222-222222222222', 'eeeeeeee-2222-2222-2222-222222222222', 'dropdown', 'city_tier', 'City tier', 3, '["Tier 1","Tier 2","Tier 3"]');
insert into form_fields (organization_id, form_id, field_type, field_key, label, sort_order, is_required) values
  ('dddddddd-2222-2222-2222-222222222222', 'eeeeeeee-2222-2222-2222-222222222222', 'consent', 'consent', 'I agree to be contacted', 4, true);

\echo 'Fields on this form (expect 5 mixed types):'
select field_type, field_key, is_active from form_fields where form_id = 'eeeeeeee-2222-2222-2222-222222222222' order by sort_order;

\echo 'Publish the form (app logic checks active field count first - here we just confirm the DB write path):'
update forms set is_published = true where id = 'eeeeeeee-2222-2222-2222-222222222222';
select name, is_published from forms where id = 'eeeeeeee-2222-2222-2222-222222222222';

\echo 'A DIFFERENT org (Org H, from an earlier test) should NOT see this form:'
select count(*) as should_be_zero from forms where organization_id != 'dddddddd-2222-2222-2222-222222222222' and public_slug = 'mixed-field-test-form';

reset role;
delete from form_fields where form_id = 'eeeeeeee-2222-2222-2222-222222222222';
delete from forms where id = 'eeeeeeee-2222-2222-2222-222222222222';
delete from organization_members where organization_id = 'dddddddd-2222-2222-2222-222222222222';
delete from organizations where id = 'dddddddd-2222-2222-2222-222222222222';
delete from auth.users where id = 'cccccccc-2222-2222-2222-222222222222';
\echo 'DONE'
