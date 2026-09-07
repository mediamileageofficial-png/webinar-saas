insert into auth.users (id, email) values ('11117777-0000-0000-0000-000000001117', 'owner-cred@example.com');
insert into organizations (id, name, slug) values ('22228888-0000-0000-0000-000000002228', 'Org Y', 'org-y');
insert into organization_members (organization_id, user_id, role) values
  ('22228888-0000-0000-0000-000000002228', '11117777-0000-0000-0000-000000001117', 'organization_owner');
insert into organization_credentials (organization_id, provider, credentials) values
  ('22228888-0000-0000-0000-000000002228', 'cashfree', '{"appId":"real-app-id","secretKey":"super-secret-value"}');

-- Match real Supabase's default: authenticated role gets broad table-level
-- GRANTs, with RLS policies as the actual enforcement layer (not table GRANTs).
grant select, insert, update, delete on organization_credentials to app_authenticated;

set role app_authenticated;
select set_config('request.jwt.claim.sub', '11117777-0000-0000-0000-000000001117', false);

\echo 'With proper table GRANTs in place (matching real Supabase), the org owner SELECTs their own credentials (expect 0 rows - RLS itself, not missing grants, is what blocks this):'
select * from organization_credentials where organization_id = '22228888-0000-0000-0000-000000002228';

\echo 'The org owner tries to INSERT a credential directly (expect RLS policy violation, not a grant error):'
insert into organization_credentials (organization_id, provider, credentials) values
  ('22228888-0000-0000-0000-000000002228', 'msg91', '{"authKey":"sneaky"}');

reset role;
delete from organization_credentials where organization_id = '22228888-0000-0000-0000-000000002228';
delete from organization_members where organization_id = '22228888-0000-0000-0000-000000002228';
delete from organizations where id = '22228888-0000-0000-0000-000000002228';
delete from auth.users where id = '11117777-0000-0000-0000-000000001117';
\echo 'DONE'
