import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { tables } from './domain-import-tables.mjs';
import { validateAuthUsers, validateStorage } from './supabase-snapshot-identities.mjs';

export const expectedSupabaseProjectId = 'jypshhgfuvwmtbbcxmhs';
const targetOnlyColumns = new Map([
  ['public.bookings', new Set(['request_id'])],
  ['public.streams', new Set(['request_id'])],
  ['public.venue_bookings', new Set(['request_id'])],
  ['public.zoom_meetings', new Set(['request_id'])],
  ['public.scheduled_message_occurrences', new Set(['attendee_ids'])],
  ['public.scheduled_message_schedules', new Set(['send_time', 'attendee_ids'])],
]);
const allowedColumnTypes = new Set([
  'bigint', 'booking_status', 'boolean', 'broadcast_kind', 'date', 'equipment_category', 'equipment_status',
  'integer', 'jsonb', 'numeric', 'request_status', 'stream_status', 'text', 'text[]',
  'timestamp with time zone', 'uuid', 'uuid[]', 'venue_booking_status', 'youtube_connection_status',
  'zoom_meeting_type', 'zoom_recurrence_type',
]);
function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateRows(table, columns, rows) {
  if (!Array.isArray(columns) || columns.length === 0 || columns.some((column) => typeof column !== 'string')) {
    fail(`Snapshot columns are invalid for ${table.sourceSchema}.${table.name}`);
  }
  if (new Set(columns).size !== columns.length) fail(`Snapshot has duplicate columns for ${table.sourceSchema}.${table.name}`);
  if (!Array.isArray(rows)) fail(`Snapshot rows are invalid for ${table.sourceSchema}.${table.name}`);
  const columnSet = new Set(columns);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!isRecord(row) || Object.keys(row).length !== columns.length || Object.keys(row).some((key) => !columnSet.has(key))) {
      fail(`Snapshot row ${index + 1} has an unexpected shape for ${table.sourceSchema}.${table.name}`);
    }
  }
}

export function validateSupabaseSnapshot(snapshot) {
  if (!isRecord(snapshot) || snapshot.version !== 1 || snapshot.projectId !== expectedSupabaseProjectId
    || typeof snapshot.exportedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.exportedAt))) {
    fail('Snapshot version, project identity, or export timestamp is invalid');
  }
  if (!Array.isArray(snapshot.tables) || snapshot.tables.length !== tables.length) fail(`Snapshot must contain exactly ${tables.length} approved domain tables`);
  const byName = new Map();
  for (const item of snapshot.tables) {
    if (!isRecord(item) || typeof item.name !== 'string' || byName.has(`${item.sourceSchema}.${item.name}`)) fail('Snapshot table inventory contains an invalid or duplicate entry');
    byName.set(`${item.sourceSchema}.${item.name}`, item);
  }
  for (const table of tables) {
    const label = `${table.sourceSchema}.${table.name}`;
    const item = byName.get(label);
    if (!item || item.targetSchema !== table.targetSchema) fail(`Snapshot table inventory is missing ${label} or maps it to an unexpected target`);
    validateRows(table, item.columns, item.rows);
    const allowedExtras = targetOnlyColumns.get(`${table.targetSchema}.${table.name}`) ?? new Set();
    if (item.columns.some((column) => allowedExtras.has(column))) fail(`Snapshot unexpectedly includes target-only columns for ${label}`);
    if (!isRecord(item.columnTypes) || Object.keys(item.columnTypes).length !== item.columns.length
      || item.columns.some((column) => !allowedColumnTypes.has(item.columnTypes[column]))) {
      fail(`Snapshot column types are invalid for ${label}`);
    }
    if (typeof item.sourceDigest !== 'string' || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/i.test(item.sourceDigest)) {
      fail(`Snapshot source fingerprint is missing for ${label}`);
    }
    if (item.sourceSchema !== table.sourceSchema || item.name !== table.name || item.targetSchema !== table.targetSchema) {
      fail(`Snapshot table mapping is invalid for ${label}`);
    }
  }
  if (!Array.isArray(snapshot.sourceFingerprints) || snapshot.sourceFingerprints.length !== tables.length) {
    fail('Snapshot source fingerprint inventory is incomplete');
  }
  const fingerprints = new Map();
  for (const item of snapshot.sourceFingerprints) {
    if (!isRecord(item) || typeof item.name !== 'string' || !Number.isInteger(item.rows) || item.rows < 0
      || typeof item.digest !== 'string' || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/i.test(item.digest) || fingerprints.has(item.name)) {
      fail('Snapshot source fingerprint inventory is invalid');
    }
    fingerprints.set(item.name, item);
  }
  for (const table of tables) {
    const label = `${table.sourceSchema}.${table.name}`;
    const item = byName.get(label);
    const fingerprint = fingerprints.get(label);
    if (!fingerprint || fingerprint.rows !== item.rows.length || fingerprint.digest !== item.sourceDigest) {
      fail(`Snapshot row count or source fingerprint does not match ${label}`);
    }
  }
  const users = byName.get('public.users');
  validateAuthUsers(snapshot.authUsers, users.rows, fail);
  validateStorage(snapshot, fail);
  return { byName, rowCounts: Object.fromEntries(tables.map((table) => [`${table.sourceSchema}.${table.name}`, byName.get(`${table.sourceSchema}.${table.name}`).rows.length])) };
}

export function allowedTargetOnlyColumns(table) {
  return [...(targetOnlyColumns.get(`${table.targetSchema}.${table.name}`) ?? [])];
}

export async function readAndValidateSnapshot(path) {
  const contents = await readFile(path);
  let snapshot;
  try {
    snapshot = JSON.parse(contents.toString('utf8'));
  } catch {
    fail('Snapshot file is not valid JSON');
  }
  const validation = validateSupabaseSnapshot(snapshot);
  return { snapshot, validation, digest: createHash('sha256').update(contents).digest('hex') };
}

export function canonicalJson(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Buffer.isBuffer(value)) return JSON.stringify(value.toString('base64'));
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
