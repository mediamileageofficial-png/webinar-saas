insert into organizations (id, name, slug) values ('66660000-0000-0000-0000-000000000666', 'Org V', 'org-v');
insert into forms (id, organization_id, name, public_slug) values
  ('77770000-0000-0000-0000-000000000777', '66660000-0000-0000-0000-000000000666', 'Form V', 'form-v');

\echo 'Simulate 5 "concurrent" page loads via the atomic function - expect view_count = 5:'
select increment_form_view_count('77770000-0000-0000-0000-000000000777');
select increment_form_view_count('77770000-0000-0000-0000-000000000777');
select increment_form_view_count('77770000-0000-0000-0000-000000000777');
select increment_form_view_count('77770000-0000-0000-0000-000000000777');
select increment_form_view_count('77770000-0000-0000-0000-000000000777');
select view_count from forms where id = '77770000-0000-0000-0000-000000000777';

delete from forms where id = '77770000-0000-0000-0000-000000000777';
delete from organizations where id = '66660000-0000-0000-0000-000000000666';
\echo 'DONE'
