insert into auth.users (id, email) values ('11117777-0000-0000-0000-000000001117', 'owner-cred@example.com');
insert into organizations (id, name, slug) values ('22228888-0000-0000-0000-000000002228', 'Org Y', 'org-y');
insert into organization_members (organization_id, user_id, role) values
  ('22228888-0000-0000-0000-000000002228', '11117777-0000-0000-0000-000000001117', 'organization_owner');

-- Credential inserted as the "service role" (simulated here as superuser,
-- which bypasses RLS just like real service_role does).
insert into organization_credentials (organization_id, provider, credentials) values
  ('22228888-0000-0000-0000-000000002228', 'cashfree', '{"appId":"real-app-id","secretKey":"super-secret-value"}');

set role app_authenticated;
select set_config('request.jwt.claim.sub', '11117777-0000-0000-0000-000000001117', false);

\echo 'The ORG OWNER themselves tries to read their own credentials directly (expect 0 rows - RLS denies everyone but service_role):'
select * from organization_credentials where organization_id = '22228888-0000-0000-0000-000000002228';

\echo 'The org owner tries to INSERT a credential directly (expect RLS ERROR):'
insert into organization_credentials (organization_id, provider, credentials) values
  ('22228888-0000-0000-0000-000000002228', 'msg91', '{"authKey":"sneaky"}');

reset role;
\echo 'As service-role-equivalent (superuser), the credential IS readable (this is the only path the app uses):'
select provider, credentials->>'appId' as app_id from organization_credentials where organization_id = '22228888-0000-0000-0000-000000002228';

delete from organization_credentials where organization_id = '22228888-0000-0000-0000-000000002228';
delete from organization_members where organization_id = '22228888-0000-0000-0000-000000002228';
delete from organizations where id = '22228888-0000-0000-0000-000000002228';
delete from auth.users where id = '11117777-0000-0000-0000-000000001117';
\echo 'DONE'
