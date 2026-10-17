import { createHash } from 'node:crypto';
import { tables, qualifiedName } from './domain-import-tables.mjs';

const authTables = ['user', 'account', 'session', 'verification'];
const additionalTables = [
  ...authTables.map((name) => ({ schema: 'moc_auth', name })),
  { schema: 'moc_private', name: 'storage_objects' },
];

export async function storageRehearsalFingerprint(client) {
  const hash = createHash('sha256');
  let rowCount = 0;
  const relations = [
    ...tables.map((table) => ({ schema: table.targetSchema, name: table.name })),
    ...additionalTables,
  ];
  for (const relation of relations) {
    const label = `${relation.schema}.${relation.name}`;
    const rows = await client.query(
      `SELECT to_jsonb(source_row)::text AS row_json FROM ${qualifiedName(relation.schema, relation.name)} AS source_row ORDER BY to_jsonb(source_row)::text`,
    );
    hash.update(`${label}\n`);
    for (const row of rows.rows) {
      hash.update(`${row.row_json}\n`);
      rowCount += 1;
    }
  }
  return { digest: hash.digest('hex'), rowCount };
}
