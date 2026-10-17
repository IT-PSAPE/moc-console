import { getColumns, getPrimaryKey } from './domain-import-transfer.mjs';
import { tables } from './domain-import-tables.mjs';
import { allowedTargetOnlyColumns, canonicalJson } from './supabase-snapshot-validation.mjs';
import { targetOnlyRows } from './supabase-snapshot-target-state.mjs';

export async function validateTargetSchema(client, validation) {
  for (const table of tables) {
    const label = `${table.sourceSchema}.${table.name}`;
    const snapshotTable = validation.byName.get(label);
    const targetColumns = await getColumns(client, table.targetSchema, table.name);
    const typeResult = await client.query(
      `SELECT attribute.attname AS column_name, format_type(attribute.atttypid, attribute.atttypmod) AS column_type
         FROM pg_attribute AS attribute
         JOIN pg_class AS relation ON relation.oid=attribute.attrelid
         JOIN pg_namespace AS namespace ON namespace.oid=relation.relnamespace
        WHERE namespace.nspname=$1 AND relation.relname=$2 AND attribute.attnum>0 AND NOT attribute.attisdropped`,
      [table.targetSchema, table.name],
    );
    const targetTypes = new Map(typeResult.rows.map((row) => [row.column_name, row.column_type]));
    const snapshotColumns = snapshotTable.columns;
    const allowedExtras = new Set(allowedTargetOnlyColumns(table));
    const extras = targetColumns.filter((column) => !snapshotColumns.includes(column));
    if (extras.some((column) => !allowedExtras.has(column))) throw new Error(`Unexpected target columns for ${label}`);
    if (snapshotColumns.some((column) => !targetColumns.includes(column))) throw new Error(`Target is missing imported columns for ${label}`);
    for (const column of snapshotColumns) {
      const sourceType = snapshotTable.columnTypes[column];
      const targetType = targetTypes.get(column);
      const approvedDateCast = table.name === 'scheduled_message_occurrences' && column === 'send_on'
        && sourceType === 'date' && targetType === 'timestamp with time zone';
      const approvedIntegerWidening = table.name === 'scheduled_message_schedules' && column === 'expiry_hours'
        && sourceType === 'integer' && targetType === 'numeric';
      if (sourceType !== targetType && !approvedDateCast && !approvedIntegerWidening) throw new Error(`Unapproved source/target type mapping for ${label}.${column}: ${sourceType} -> ${targetType}`);
    }
    const primaryKey = await getPrimaryKey(client, table.targetSchema, table.name);
    if (primaryKey.some((column) => !snapshotColumns.includes(column))) throw new Error(`Snapshot is missing a primary-key column for ${label}`);
    const seen = new Set();
    for (const row of snapshotTable.rows) {
      const key = primaryKey.map((column) => canonicalJson(row[column])).join('|');
      if (primaryKey.some((column) => row[column] === null || row[column] === undefined) || seen.has(key)) {
        throw new Error(`Snapshot contains a missing or duplicate primary key for ${label}`);
      }
      seen.add(key);
    }
  }
}

export async function getReplacementForeignKeys(client) {
  const relations = tables.map((table) => `${table.targetSchema}.${table.name}`);
  const result = await client.query(
    `SELECT constraint_row.conname, source_namespace.nspname AS source_schema,
            source_relation.relname AS source_table, pg_get_constraintdef(constraint_row.oid) AS definition
       FROM pg_constraint AS constraint_row
       JOIN pg_class AS source_relation ON source_relation.oid=constraint_row.conrelid
       JOIN pg_namespace AS source_namespace ON source_namespace.oid=source_relation.relnamespace
       JOIN pg_class AS target_relation ON target_relation.oid=constraint_row.confrelid
       JOIN pg_namespace AS target_namespace ON target_namespace.oid=target_relation.relnamespace
      WHERE constraint_row.contype='f'
        AND (format('%I.%I',source_namespace.nspname,source_relation.relname)=ANY($1::text[])
          OR format('%I.%I',target_namespace.nspname,target_relation.relname)=ANY($1::text[])
          OR constraint_row.confrelid='moc_auth."user"'::regclass)
      ORDER BY source_namespace.nspname,source_relation.relname,constraint_row.conname`,
    [relations],
  );
  return result.rows;
}

export async function validateSnapshotTarget(client, snapshot, validation) {
  await validateTargetSchema(client, validation);
  const profiles = validation.byName.get('public.users').rows;
  const authById = new Map(snapshot.authUsers.map((user) => [user.id, user]));
  const workspaces = validation.byName.get('public.workspaces').rows;
  const memberships = validation.byName.get('public.workspace_users').rows;
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace.slug]));
  const membershipByUser = new Map(memberships.map((membership) => [membership.user_id, membership.workspace_id]));
  for (const profile of profiles) {
    const auth = authById.get(profile.id);
    if (!auth) throw new Error('Snapshot auth/profile ID mismatch');
    if (profile.email.toLocaleLowerCase() !== auth.email.toLocaleLowerCase()) throw new Error('Snapshot auth/profile email mismatch');
    if (membershipByUser.has(profile.id) && !workspaceById.has(membershipByUser.get(profile.id))) throw new Error('Snapshot user references a missing workspace');
  }
  await targetOnlyRows(client);
}
