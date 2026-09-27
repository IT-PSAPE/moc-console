#!/usr/bin/env bash
# Builds a blank MoC Console database up to the current schema:
#   1. the consolidated baseline (phase-01..03),
#   2. the target-schema cleanup, which converges that baseline,
#   3. every file in migrations/, in filename order,
# and records each migration in supabase_migrations.schema_migrations so the
# Supabase CLI treats them as already applied.
#
# Usage: supabase/build-fresh-database.sh "postgresql://…"
# Only for an empty project. Never point it at a database with data.
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <database-url>" >&2
  exit 1
fi

DATABASE_URL="$1"
DIR="$(cd "$(dirname "$0")" && pwd)"

run() {
  echo "→ $(basename "$1")"
  psql "$DATABASE_URL" --quiet --no-psqlrc -v ON_ERROR_STOP=1 -f "$1" >/dev/null
}

run "$DIR/phase-01-schema.sql"
run "$DIR/phase-02-logic.sql"
run "$DIR/phase-03-security.sql"
run "$DIR/patches/2026-08-04-moc-console-target-schema-cleanup.sql"

psql "$DATABASE_URL" --quiet --no-psqlrc -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version    text PRIMARY KEY,
  statements text[],
  name       text
);
SQL

for file in "$DIR"/migrations/*.sql; do
  base="$(basename "$file" .sql)"
  version="${base%%_*}"
  name="${base#*_}"
  run "$file"
  psql "$DATABASE_URL" --quiet --no-psqlrc -v ON_ERROR_STOP=1 \
    -v version="$version" -v name="$name" >/dev/null <<'SQL'
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES (:'version', :'name')
ON CONFLICT (version) DO NOTHING;
SQL
done

echo "Done. Run verify-current-schema.sql to confirm the result."
