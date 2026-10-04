import { createHash } from 'node:crypto';
import { pageSize, qualifiedName, quoteIdentifier, tables } from './domain-import-tables.mjs';

export async function getColumns(client, schema, table) {
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
    [schema, table],
  );
  return result.rows.map((row) => row.column_name);
}

export async function getPrimaryKey(client, schema, table) {
  const result = await client.query(
    `SELECT array_agg(attribute.attname::text ORDER BY key_column.ordinality) AS columns
     FROM pg_constraint AS constraint_row
     CROSS JOIN LATERAL unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(attnum, ordinality)
     JOIN pg_attribute AS attribute ON attribute.attrelid = constraint_row.conrelid
       AND attribute.attnum = key_column.attnum
     WHERE constraint_row.conrelid = format('%I.%I', $1::text, $2::text)::regclass
       AND constraint_row.contype = 'p'`,
    [schema, table],
  );
  const key = result.rows[0]?.columns;
  if (!Array.isArray(key) || key.length === 0) throw new Error(`${schema}.${table} has no primary key`);
  return key;
}

export async function readPage(client, schema, table, columns, primaryKey, offset) {
  const selected = columns.map(quoteIdentifier).join(', ');
  const order = primaryKey.map(quoteIdentifier).join(', ');
  return client.query(
    `SELECT ${selected} FROM ${qualifiedName(schema, table)} ORDER BY ${order} LIMIT $1 OFFSET $2`,
    [pageSize, offset],
  );
}

export async function tableCount(client, schema, table) {
  const result = await client.query(`SELECT count(*)::text AS count FROM ${qualifiedName(schema, table)}`);
  return Number(result.rows[0].count);
}

export async function fingerprint(client, schema, table, columns, primaryKey) {
  const count = await tableCount(client, schema, table.name);
  const hash = createHash('sha256');
  for (let offset = 0; offset < count; offset += pageSize) {
    const page = await readPage(client, schema, table.name, columns, primaryKey, offset);
    for (const row of page.rows) hash.update(`${JSON.stringify(row)}\n`);
  }
  return { count, digest: hash.digest('hex') };
}

export async function insertPage(target, table, columns, rows) {
  if (rows.length === 0) return;
  const quotedColumns = columns.map(quoteIdentifier).join(', ');
  const values = [];
  const tuples = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      values.push(row[column]);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  await target.query(
    `INSERT INTO ${qualifiedName(table.targetSchema, table.name)} (${quotedColumns}) OVERRIDING SYSTEM VALUE VALUES ${tuples.join(', ')}`,
    values,
  );
}

export async function copyTable(source, target, table, columns, primaryKey) {
  const total = await tableCount(source, table.sourceSchema, table.name);
  for (let offset = 0; offset < total; offset += pageSize) {
    const page = await readPage(source, table.sourceSchema, table.name, columns, primaryKey, offset);
    await insertPage(target, table, columns, page.rows);
  }
}

export async function syncSequences(target) {
  const result = await target.query(
    `SELECT table_schema, table_name, column_name,
            pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) AS sequence_name
       FROM information_schema.columns
      WHERE table_schema IN ('public', 'moc_private')
        AND table_name = ANY($1::text[])
        AND (is_identity = 'YES' OR column_default LIKE 'nextval(%')`,
    [tables.map((table) => table.name)],
  );
  for (const row of result.rows) {
    if (!row.sequence_name) continue;
    const column = quoteIdentifier(row.column_name);
    const relation = qualifiedName(row.table_schema, row.table_name);
    await target.query(
      `SELECT setval($1::regclass, coalesce((SELECT max(${column}) FROM ${relation}), 1),
                     EXISTS (SELECT 1 FROM ${relation}))`,
      [row.sequence_name],
    );
  }
}
