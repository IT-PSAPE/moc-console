import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const publicTables = [
  'bookings', 'booking_items', 'broadcasts', 'broadcast_items', 'checklist_templates',
  'checklists', 'checklist_sections', 'checklist_items', 'checklist_item_assignees',
  'api_rate_limit_windows', 'equipment', 'notification_deliveries', 'notification_ingest_replays',
  'notification_message_templates', 'notification_outbox',
  'notification_routes', 'notification_settings', 'request_activity', 'request_assignees',
  'request_categories', 'request_comments', 'requests', 'roles', 'streams', 'telegram_groups',
  'telegram_group_topics', 'telegram_link_tokens', 'telegram_webhook_updates', 'template_sections',
  'scheduled_message_occurrences', 'scheduled_message_responses', 'scheduled_message_schedules',
  'scheduled_message_series_changes', 'scheduled_message_sessions', 'scheduled_message_templates',
  'template_items', 'users', 'venue_booking_slots', 'venue_bookings', 'venue_events', 'venues',
  'workspace_join_requests', 'workspace_member_types', 'workspace_users', 'workspaces',
  'youtube_connections', 'zoom_connections', 'zoom_meetings',
];
const tables = [
  ...publicTables.map((name) => ({ sourceSchema: 'public', targetSchema: 'public', name })),
  { sourceSchema: 'private', targetSchema: 'moc_private', name: 'integration_oauth_tokens' },
];

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function qualifiedName(schema, table) {
  return `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;
}

function configuredUrl(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  try {
    const parsed = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error(`${name} must be a PostgreSQL URL`);
  }
  return value;
}

async function fingerprint(pool, schema, table) {
  const [countResult, columnResult, keyResult] = await Promise.all([
    pool.query(`SELECT count(*)::text AS count FROM ${qualifiedName(schema, table)}`),
    pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`, [schema, table]),
    pool.query(
      `SELECT array_agg(attribute.attname::text ORDER BY key_column.ordinality) AS columns
         FROM pg_constraint AS constraint_row
         CROSS JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(attnum, ordinality)
         JOIN pg_attribute AS attribute ON attribute.attrelid = constraint_row.conrelid
          AND attribute.attnum = key_column.attnum
        WHERE constraint_row.conrelid = format('%I.%I', $1::text, $2::text)::regclass
          AND constraint_row.contype = 'p'`,
      [schema, table],
    ),
  ]);
  const columns = columnResult.rows.map((row) => `"${row.column_name.replaceAll('"', '""')}"`);
  const primaryKey = keyResult.rows[0]?.columns;
  if (columns.length === 0 || !Array.isArray(primaryKey) || primaryKey.length === 0) {
    throw new Error(`Cannot fingerprint ${schema}.${table} without columns and a primary key`);
  }
  const count = Number(countResult.rows[0].count);
  const digest = createHash('sha256');
  const order = primaryKey.map((column) => `"${column.replaceAll('"', '""')}"`).join(', ');
  const selected = columns.join(', ');
  for (let offset = 0; offset < count; offset += 500) {
    const page = await pool.query(
      `SELECT ${selected} FROM ${qualifiedName(schema, table)} ORDER BY ${order} LIMIT $1 OFFSET $2`,
      [500, offset],
    );
    for (const row of page.rows) digest.update(`${JSON.stringify(row)}\n`);
  }
  return { count, digest: digest.digest('hex') };
}

async function assertSourceTableInventory(pool) {
  const publicResult = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  const privateResult = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'private'");
  const allowedPublic = new Set([
    ...publicTables,
    'schema_migrations',
    'broadcast_revision_counters',
    'broadcast_revisions',
  ]);
  const allowedPrivate = new Set(['integration_oauth_tokens']);
  const unexpectedPublic = publicResult.rows.map((row) => row.tablename).filter((name) => !allowedPublic.has(name));
  const missingPublic = publicTables.filter((name) => !publicResult.rows.some((row) => row.tablename === name));
  const unexpectedPrivate = privateResult.rows.map((row) => row.tablename).filter((name) => !allowedPrivate.has(name));
  if (unexpectedPublic.length || missingPublic.length || unexpectedPrivate.length
    || !privateResult.rows.some((row) => row.tablename === 'integration_oauth_tokens')) {
    throw new Error(`Source table drift; unexpected public ${unexpectedPublic.join(', ') || 'none'}, missing public ${missingPublic.join(', ') || 'none'}, unexpected private ${unexpectedPrivate.join(', ') || 'none'}`);
  }
}

function safeError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[database URL redacted]');
}

async function main() {
  const source = new Pool({ connectionString: configuredUrl('LEGACY_SOURCE_DATABASE_URL'), max: 1, connectionTimeoutMillis: 5_000 });
  const target = new Pool({ connectionString: configuredUrl('NEON_DATABASE_URL'), max: 1, connectionTimeoutMillis: 5_000 });
  let failed = false;
  try {
    await assertSourceTableInventory(source);
    for (const table of tables) {
      const [sourceResult, targetResult] = await Promise.all([
        fingerprint(source, table.sourceSchema, table.name),
        fingerprint(target, table.targetSchema, table.name),
      ]);
      const matches = sourceResult.count === targetResult.count && sourceResult.digest === targetResult.digest;
      failed ||= !matches;
      process.stdout.write(`${matches ? 'MATCH' : 'DIFF'} ${table.sourceSchema}.${table.name}: ${sourceResult.count} → ${targetResult.count}\n`);
    }
  } finally {
    await Promise.all([source.end(), target.end()]);
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Import parity failed: ${safeError(error)}\n`);
  process.exitCode = 1;
});
