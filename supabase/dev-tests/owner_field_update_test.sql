insert into auth.users (id, email) values ('66666666-6666-6666-6666-666666666666', 'owner-d@example.com');
insert into organizations (id, name, slug, status) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Org D', 'org-d', 'active');
insert into organization_members (organization_id, user_id, role) values ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'organization_owner');

set role app_authenticated;
select set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', false);

\echo 'Owner updates their own org NAME (status unchanged) - expect success:'
update organizations set name = 'Org D Renamed' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select name, status from organizations where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

reset role;
delete from organization_members where organization_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from organizations where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
delete from auth.users where id = '66666666-6666-6666-6666-666666666666';
\echo 'DONE'
