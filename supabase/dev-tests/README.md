# Development verification scripts - NOT migrations

Everything in this folder is a throwaway SQL script written during
development to verify a specific behavior against a local Postgres instance
(RLS isolation, dedupe logic, webhook idempotency, checklist state
transitions, and so on). Each one is self-contained: it inserts its own
fixture rows (using clearly fake/random UUIDs), asserts something, and
deletes what it inserted at the end.

**Do not run these against a Supabase project, staging, or production.**
They are not part of the schema and are not applied during deployment - only
the numbered files in `../migrations/` are real migrations. This folder
exists purely as a record of what was verified and how, in case similar
verification is useful again later (e.g. after a schema change).
