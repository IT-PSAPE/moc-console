import { dropForeignKeys, restoreForeignKeys, verifyForeignKeys } from './domain-import-foreign-keys.mjs';
import { qualifiedName, quoteIdentifier, tables } from './domain-import-tables.mjs';
import { syncSequences } from './domain-import-transfer.mjs';
import { getReplacementForeignKeys, validateSnapshotTarget } from './supabase-snapshot-db-contract.mjs';
import { targetState } from './supabase-snapshot-target-state.mjs';
import { verifyAuthParity, verifyImportedFingerprints, verifySourceFingerprints, verifyTableParity, verifyTargetOnlyDefaults } from './supabase-snapshot-db-parity.mjs';

async function verifyAuthForeignKeys(client) {
  const result = await client.query(
    `SELECT count(*)::integer AS invalid_count FROM pg_constraint
      WHERE contype='f' AND confrelid='moc_auth."user"'::regclass AND NOT convalidated`,
  );
  if (result.rows[0].invalid_count !== 0) throw new Error('Auth foreign-key validation failed');
}

export async function insertRows(client, table, columns, rows, columnTypes) {
  if (rows.length === 0) return;
  const sqlColumns = columns.map(quoteIdentifier).join(', ');
  const values = [];
  const tuples = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      let value = row[column];
      if (value !== null && ['json', 'jsonb'].includes(columnTypes.get(column))) value = JSON.stringify(value);
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`Snapshot has an invalid numeric value for ${table.targetSchema}.${table.name}`);
      values.push(value);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  await client.query(`INSERT INTO ${qualifiedName(table.targetSchema, table.name)} (${sqlColumns}) OVERRIDING SYSTEM VALUE VALUES ${tuples.join(', ')}`, values);
}

export async function copySnapshotRows(client, snapshot, validation) {
  for (const table of tables) {
    const item = validation.byName.get(`${table.sourceSchema}.${table.name}`);
    const typeResult = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2`,
      [table.targetSchema, table.name],
    );
    const columnTypes = new Map(typeResult.rows.map((row) => [row.column_name, row.data_type]));
    await insertRows(client, table, item.columns, item.rows, columnTypes);
  }
}

export async function importAuthUsers(client, snapshot, profiles, workspaces, memberships) {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace.slug]));
  const membershipByUser = new Map();
  for (const membership of memberships) {
    const workspaceIds = membershipByUser.get(membership.user_id) ?? new Set();
    workspaceIds.add(membership.workspace_id);
    membershipByUser.set(membership.user_id, workspaceIds);
  }
  for (const source of snapshot.authUsers) {
    const profile = profileById.get(source.id);
    const workspaceIds = membershipByUser.get(source.id);
    const membershipWorkspace = workspaceIds?.size === 1 ? [...workspaceIds][0] : null;
    await client.query(
      `INSERT INTO moc_auth."user" (id,name,email,email_verified,image,surname,workspace_slug,created_at,updated_at)
       VALUES ($1,$2,$3,true,NULL,$4,$5,$6,$7)`,
      [source.id, `${profile.name} ${profile.surname}`.trim(), source.email, profile.surname, membershipWorkspace ? workspaceById.get(membershipWorkspace) ?? null : null, source.created_at, source.updated_at],
    );
    await client.query(
      `INSERT INTO moc_auth.account (id,account_id,provider_id,user_id,password,created_at,updated_at)
       VALUES ($1,$2,'credential',$1,$3,$4,$5)`,
      [source.id, source.id, source.encrypted_password, source.created_at, source.updated_at],
    );
  }
}

export async function applyPlan(client, snapshot, validation, snapshotDigest, plan) {
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  try {
    const lockNames = tables.map((table) => qualifiedName(table.targetSchema, table.name));
    await client.query(`LOCK TABLE ${lockNames.join(', ')}, moc_auth."user", moc_auth.account, moc_auth.session, moc_auth.verification IN ACCESS EXCLUSIVE MODE`);
    const currentState = await targetState(client);
    if (currentState.fingerprint !== plan.target.fingerprint
      || currentState.identity.database_name !== plan.target.databaseName
      || currentState.identity.server_address !== plan.target.serverAddress
      || Number(currentState.identity.server_port) !== Number(plan.target.serverPort)) {
      throw new Error('Target changed after the dry-run plan; create and review a new plan');
    }
    if (snapshotDigest !== plan.snapshotSha256) throw new Error('Snapshot changed after the dry-run plan');
    await validateSnapshotTarget(client, snapshot, validation);
    await verifySourceFingerprints(client, validation);

    const constraints = await getReplacementForeignKeys(client);
    await dropForeignKeys(client, constraints);
    for (const table of tables) await client.query(`ALTER TABLE ${qualifiedName(table.targetSchema, table.name)} DISABLE TRIGGER USER`);
    await client.query('DELETE FROM moc_auth.session');
    await client.query('DELETE FROM moc_auth.account');
    await client.query('DELETE FROM moc_auth.verification');
    await client.query('DELETE FROM moc_auth."user"');
    await client.query(`TRUNCATE TABLE ${tables.map((table) => qualifiedName(table.targetSchema, table.name)).join(', ')}`);

    await copySnapshotRows(client, snapshot, validation);
    const profiles = validation.byName.get('public.users').rows;
    const workspaces = validation.byName.get('public.workspaces').rows;
    const memberships = validation.byName.get('public.workspace_users').rows;
    await importAuthUsers(client, snapshot, profiles, workspaces, memberships);
    await syncSequences(client);
    for (const table of tables) await client.query(`ALTER TABLE ${qualifiedName(table.targetSchema, table.name)} ENABLE TRIGGER USER`);
    await restoreForeignKeys(client, constraints);
    await verifyForeignKeys(client);
    await verifyAuthForeignKeys(client);

    await verifyTableParity(client, snapshot, validation);
    await verifyImportedFingerprints(client, validation);
    await verifyTargetOnlyDefaults(client, validation);
    await verifyAuthParity(client, snapshot, profiles);
    const importedState = await targetState(client);
    if (importedState.authCounts.user !== snapshot.authUsers.length || importedState.authCounts.account !== snapshot.authUsers.length
      || importedState.authCounts.session !== 0 || importedState.authCounts.verification !== 0) {
      throw new Error('Imported auth identity verification failed');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
}
