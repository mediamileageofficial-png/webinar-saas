insert into organizations (id, name, slug, settings) values
  ('44440001-0000-0000-0000-000000004440', 'Org Merge', 'org-merge', '{"onboardingDismissed": true}');

\echo 'BEFORE: onboardingDismissed flag is set:'
select settings from organizations where id = '44440001-0000-0000-0000-000000004440';

\echo 'Simulating the FIXED profile save (read-then-merge) with a new brandColor:'
update organizations
set settings = settings || '{"brandColor": "#123456"}'::jsonb
where id = '44440001-0000-0000-0000-000000004440';

\echo 'AFTER: both keys survive (this is what read-then-merge achieves):'
select settings from organizations where id = '44440001-0000-0000-0000-000000004440';

delete from organizations where id = '44440001-0000-0000-0000-000000004440';
\echo 'DONE'
