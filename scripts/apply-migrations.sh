#!/usr/bin/env bash
# Applies every migration in supabase/migrations/, in filename order, against
# the database at $DATABASE_URL (a plain Postgres connection string).
#
# For a Supabase project, get this from: Project Settings -> Database ->
# Connection string ("URI" tab, with the password filled in). Use the
# "Session pooler" or direct connection string, not the pgbouncer transaction
# pooler - some of these migrations use multi-statement DO blocks that need a
# session-level connection.
#
# IMPORTANT: this only runs supabase/migrations/*.sql - it deliberately does
# NOT touch supabase/dev-tests/ (throwaway local verification scripts) or
# supabase/seed/ (demo data, run separately and only when you want it).
#
# Usage:
#   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" ./scripts/apply-migrations.sh

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set." >&2
  echo "Usage: DATABASE_URL=postgresql://... ./scripts/apply-migrations.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../supabase/migrations"

echo "Applying migrations from $MIGRATIONS_DIR ..."

for file in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$file")"

  # 0000_supabase_auth_stub.sql exists ONLY for local development against a
  # plain Postgres instance without Supabase - a real Supabase project
  # already provides the auth schema, auth.uid(), and the anon/authenticated/
  # service_role roles. Running this stub against Supabase would conflict
  # with what Supabase manages itself.
  if [ "$name" = "0000_supabase_auth_stub.sql" ]; then
    echo "Skipping $name (local-dev-only stub - Supabase already provides this)"
    continue
  fi

  echo "Applying $name ..."
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "All migrations applied successfully."
