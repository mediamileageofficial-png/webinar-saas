insert into organizations (id, name, slug) values ('88880005-0000-0000-0000-000000008880', 'Org Dismiss', 'org-dismiss');

\echo 'Set brandColor first (simulating a profile save):'
update organizations set settings = settings || '{"brandColor": "#ff0000"}'::jsonb
where id = '88880005-0000-0000-0000-000000008880';
select settings from organizations where id = '88880005-0000-0000-0000-000000008880';

\echo 'Now dismiss the checklist (simulating dismissOnboardingChecklistAction read-then-merge):'
update organizations set settings = settings || '{"onboardingDismissed": true}'::jsonb
where id = '88880005-0000-0000-0000-000000008880';

\echo 'Both survive - brandColor was NOT wiped by dismissing the checklist:'
select settings from organizations where id = '88880005-0000-0000-0000-000000008880';

\echo 'The dashboard page reads settings.onboardingDismissed to decide whether to show the checklist at all:'
select (settings->>'onboardingDismissed')::boolean as should_hide_checklist
from organizations where id = '88880005-0000-0000-0000-000000008880';

delete from organizations where id = '88880005-0000-0000-0000-000000008880';
\echo 'DONE'
