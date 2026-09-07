-- ============================================================================
-- 0008_increment_form_view_count.sql
--
-- A plain "read view_count, add 1, write it back" from application code
-- would race under concurrent traffic (two visitors loading the form at the
-- same instant could both read the same starting value and one increment
-- would be lost). A single atomic UPDATE ... SET x = x + 1 has no such race.
-- ============================================================================

create or replace function increment_form_view_count(target_form_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update forms set view_count = view_count + 1 where id = target_form_id;
$$;

revoke all on function increment_form_view_count(uuid) from public;
grant execute on function increment_form_view_count(uuid) to service_role;
