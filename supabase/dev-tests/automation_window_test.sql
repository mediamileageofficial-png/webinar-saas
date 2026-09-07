-- Proves the tick-window arithmetic BEFORE it's implemented in TS:
-- trigger_time = anchor_time + offset_minutes
-- a webinar is "due" for a rule when: (now - window) < trigger_time <= now
-- equivalently: (now - window - offset) < anchor_time <= (now - offset)

insert into organizations (id, name, slug) values ('11112222-0000-0000-0000-000000000011', 'Org Q', 'org-q');

-- A webinar starting exactly 24h from a fixed reference "now" for reproducibility.
insert into webinars (id, organization_id, name, event_date, start_time, end_time) values
  ('22223333-0000-0000-0000-000000000022', '11112222-0000-0000-0000-000000000011', 'Test Webinar',
   '2026-10-02', '2026-10-02 10:00:00+00', '2026-10-02 11:00:00+00');

-- offset_minutes = -1440 (24h-before reminder), window = 15 minutes
\echo 'Case 1: tick runs EXACTLY at the trigger moment (now = start_time - 24h) -> expect 1 row (selected):'
select id from webinars
where organization_id = '11112222-0000-0000-0000-000000000011'
  and start_time > (timestamptz '2026-10-01 10:00:00+00' - interval '15 minutes' - (-1440 * interval '1 minute'))
  and start_time <= (timestamptz '2026-10-01 10:00:00+00' - (-1440 * interval '1 minute'));

\echo 'Case 2: tick runs 20 minutes BEFORE the trigger moment -> expect 0 rows (too early):'
select id from webinars
where organization_id = '11112222-0000-0000-0000-000000000011'
  and start_time > (timestamptz '2026-10-01 09:40:00+00' - interval '15 minutes' - (-1440 * interval '1 minute'))
  and start_time <= (timestamptz '2026-10-01 09:40:00+00' - (-1440 * interval '1 minute'));

\echo 'Case 3: tick runs 5 minutes AFTER the trigger moment, still inside the 15-min window -> expect 1 row:'
select id from webinars
where organization_id = '11112222-0000-0000-0000-000000000011'
  and start_time > (timestamptz '2026-10-01 10:05:00+00' - interval '15 minutes' - (-1440 * interval '1 minute'))
  and start_time <= (timestamptz '2026-10-01 10:05:00+00' - (-1440 * interval '1 minute'));

\echo 'Case 4: tick runs 20 minutes AFTER the trigger moment, past the 15-min window -> expect 0 rows (missed):'
select id from webinars
where organization_id = '11112222-0000-0000-0000-000000000011'
  and start_time > (timestamptz '2026-10-01 10:20:00+00' - interval '15 minutes' - (-1440 * interval '1 minute'))
  and start_time <= (timestamptz '2026-10-01 10:20:00+00' - (-1440 * interval '1 minute'));

delete from webinars where id = '22223333-0000-0000-0000-000000000022';
delete from organizations where id = '11112222-0000-0000-0000-000000000011';
\echo 'DONE'
