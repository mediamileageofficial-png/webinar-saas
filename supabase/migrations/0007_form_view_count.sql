-- ============================================================================
-- 0007_form_view_count.sql
--
-- Section 18 of the plan wants a per-form conversion rate (submissions /
-- views). We don't have a full page-view analytics pipeline, so this is a
-- deliberately simple best-effort counter incremented on each public form
-- page render - it will overcount on refreshes/bot traffic and undercount if
-- someone views via a cached page, which is an honest MVP simplification,
-- not a precise analytics measurement.
-- ============================================================================

alter table forms add column view_count integer not null default 0;
