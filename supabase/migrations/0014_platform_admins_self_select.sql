-- ============================================================================
-- 0014_platform_admins_self_select.sql
--
-- 0002 enabled RLS on platform_admins with zero policies ("default-deny for
-- all roles except service_role"). But isPlatformAdmin() in
-- lib/auth/session.ts checks admin status with the normal RLS-respecting
-- client:
--   supabase.from("platform_admins").select("user_id").eq("user_id", uid)
-- With no SELECT policy that query always returns nothing, so the platform
-- admin console 404s for everyone - even real admins. (The dev-tests never
-- caught this: they connect as a superuser that bypasses RLS.)
--
-- Fix: let a user read ONLY their own row. This reveals exactly one bit -
-- "am I an admin?" - and never lets a caller enumerate the admin list.
-- Writes stay service-role-only (no INSERT/UPDATE/DELETE policy), so admin
-- status still can't be self-granted.
-- ============================================================================

create policy platform_admins_select_self on platform_admins for select
  using (user_id = auth.uid());
