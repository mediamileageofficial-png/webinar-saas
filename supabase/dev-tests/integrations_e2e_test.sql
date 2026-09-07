insert into organizations (id, name, slug) values ('dddd0000-0000-0000-0000-0000000000dd', 'Org X', 'org-x');
insert into forms (id, organization_id, name, public_slug, is_published) values
  ('eeee0000-0000-0000-0000-0000000000ee', 'dddd0000-0000-0000-0000-0000000000dd', 'IAS Prelims Webinar Signup', 'ias-prelims-webinar-signup', true);
insert into form_fields (organization_id, form_id, field_type, field_key, label, sort_order, is_required) values
  ('dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'full_name', 'full_name', 'Full name', 0, true),
  ('dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'email', 'email', 'Email', 1, true),
  ('dddd0000-0000-0000-0000-0000000000dd', 'eeee0000-0000-0000-0000-0000000000ee', 'mobile', 'mobile', 'Mobile', 2, true);

\echo 'Real published form that the integrations page would render for:'
select id, name, public_slug, is_published from forms where id = 'eeee0000-0000-0000-0000-0000000000ee';

delete from form_fields where form_id = 'eeee0000-0000-0000-0000-0000000000ee';
delete from forms where id = 'eeee0000-0000-0000-0000-0000000000ee';
delete from organizations where id = 'dddd0000-0000-0000-0000-0000000000dd';
\echo 'DONE'
