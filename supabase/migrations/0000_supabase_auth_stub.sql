-- ============================================================================
-- 0000_supabase_auth_stub.sql
--
-- LOCAL DEVELOPMENT / TESTING ONLY.
--
-- A real Supabase project already provides the `auth` schema (auth.users,
-- auth.uid(), etc.) managed by Supabase Auth. Do NOT run this file against a
-- real Supabase project - it exists purely so this migration set can be
-- applied and RLS-tested against a plain local/self-hosted Postgres instance
-- during development.
-- ============================================================================

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);

-- Mimics Supabase's auth.uid(), which normally reads the JWT "sub" claim.
-- Locally we drive it from a session-local setting so tests can impersonate
-- different users: `select set_config('request.jwt.claim.sub', '<uuid>', true);`
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- Supabase's standard Postgres roles, so GRANTs written for a real project
-- (e.g. "grant execute ... to authenticated") apply the same way locally.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;
