insert into organizations (id, name, slug) values ('33339999-0000-0000-0000-000000003339', 'Org Z', 'org-z');

\echo 'Simulate saveOrgCredentials() writing via service role (admin client path):'
insert into organization_credentials (organization_id, provider, credentials) values
  ('33339999-0000-0000-0000-000000003339', 'cashfree', '{"appId":"tenant-app-id","secretKey":"tenant-secret","webhookSecret":"tenant-webhook-secret","env":"sandbox"}');

\echo 'getCredentialStatus() equivalent - only configured + updated_at, no secret value:'
select
  (credentials is not null) as configured,
  updated_at is not null as has_timestamp
from organization_credentials
where organization_id = '33339999-0000-0000-0000-000000003339' and provider = 'cashfree';

\echo 'getOrgCredentials() equivalent - the ONLY path that reads the actual value, used internally by the provider:'
select credentials->>'appId' as app_id, credentials->>'env' as env
from organization_credentials
where organization_id = '33339999-0000-0000-0000-000000003339' and provider = 'cashfree';

\echo 'Re-saving (upsert) updates the SAME row, not a duplicate:'
insert into organization_credentials (organization_id, provider, credentials)
values ('33339999-0000-0000-0000-000000003339', 'cashfree', '{"appId":"updated-app-id","secretKey":"new-secret","webhookSecret":"new-webhook-secret","env":"production"}')
on conflict (organization_id, provider) do update set credentials = excluded.credentials, updated_at = now();
select count(*) as row_count, credentials->>'appId' as latest_app_id
from organization_credentials
where organization_id = '33339999-0000-0000-0000-000000003339' and provider = 'cashfree'
group by credentials;

delete from organization_credentials where organization_id = '33339999-0000-0000-0000-000000003339';
delete from organizations where id = '33339999-0000-0000-0000-000000003339';
\echo 'DONE'
