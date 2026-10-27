#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ] || { [ "$#" -eq 2 ] && [ "$2" != '--legacy-import' ]; }; then
  echo 'Usage: neon/database/build-fresh-database.sh <empty-database-url> [--legacy-import]' >&2
  exit 1
fi

database_url="$1"
script_dir="$(cd "$(dirname "$0")" && pwd)"

database_has_objects="$(psql "$database_url" --quiet --no-psqlrc --tuples-only --no-align -v ON_ERROR_STOP=1 \
  -c "SELECT EXISTS (SELECT 1 FROM pg_class AS relation JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace WHERE namespace.nspname IN ('public', 'moc_private', 'moc_auth') AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f'))")"
if [ "$database_has_objects" = 't' ]; then
  echo 'Target database contains user relations; fresh bootstrap requires an empty database.' >&2
  exit 1
fi

psql "$database_url" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 \
  -f "$script_dir/00-auth-schema.sql" \
  -f "$script_dir/01-runtime-roles.sql" \
  -f "$script_dir/20-domain-final.sql" \
  -f "$script_dir/workspace-invitations.sql" \
  -f "$script_dir/user-preferences.sql" \
  -f "$script_dir/scheduled-direct-messages.sql" \
  -f "$script_dir/storage.sql" \
  -f "$script_dir/broadcast-revisions.sql" \
  -f "$script_dir/90-runtime-grants.sql" \
  -f "$script_dir/verify-final-state.sql"
if [ "${2:-}" != '--legacy-import' ]; then
  psql "$database_url" --quiet --no-psqlrc --single-transaction -v ON_ERROR_STOP=1 \
    -f "$script_dir/item-discussion.sql" \
    -f "$script_dir/verify-item-discussion.sql" \
    -f "$script_dir/scheduled-messages-v2.sql" \
    -f "$script_dir/verify-final-state.sql"
fi
printf 'Fresh MoC Neon schema installed and verified.\n'
