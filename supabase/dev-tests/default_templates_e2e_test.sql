insert into auth.users (id, email) values ('dddd4444-0000-0000-0000-000000000004', 'owner-n@example.com');

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;
end $$;
grant authenticated to app_authenticated;
grant usage on schema public to app_authenticated;
grant select, insert, update, delete on all tables in schema public to app_authenticated;
grant usage on schema auth to app_authenticated;
grant select on auth.users to app_authenticated;

set role app_authenticated;
select set_config('request.jwt.claim.sub', 'dddd4444-0000-0000-0000-000000000004', false);

\echo 'Bootstrap a new org via the self-serve function:'
select create_organization_with_owner('Org N', 'org-n');

\echo 'Default templates were seeded (expect 3 rows: reg-confirm email, payment-confirm email, reg-confirm sms):'
select t.key, t.channel, t.provider_template_id is null as no_provider_id
from message_templates t
join organizations o on o.id = t.organization_id
where o.slug = 'org-n'
order by t.key, t.channel;

reset role;
delete from message_templates where organization_id in (select id from organizations where slug = 'org-n');
delete from organization_members where organization_id in (select id from organizations where slug = 'org-n');
delete from organizations where slug = 'org-n';
delete from auth.users where id = 'dddd4444-0000-0000-0000-000000000004';
\echo 'DONE'
