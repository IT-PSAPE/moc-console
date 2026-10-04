import { publicTables, qualifiedName, quoteIdentifier } from './domain-import-tables.mjs';

export async function getForeignKeys(client) {
  return client.query(
    `SELECT constraint_row.conname,
            source_namespace.nspname AS source_schema,
            source_relation.relname AS source_table,
            target_namespace.nspname AS target_schema,
            target_relation.relname AS target_table,
            constraint_row.confmatchtype AS match_type,
            ARRAY(SELECT attribute.attname::text
                    FROM unnest(constraint_row.conkey) WITH ORDINALITY AS key_column(attnum, ordinality)
                    JOIN pg_attribute AS attribute ON attribute.attrelid = source_relation.oid
                     AND attribute.attnum = key_column.attnum
                   ORDER BY key_column.ordinality) AS source_columns,
            ARRAY(SELECT attribute.attname::text
                    FROM unnest(constraint_row.confkey) WITH ORDINALITY AS key_column(attnum, ordinality)
                    JOIN pg_attribute AS attribute ON attribute.attrelid = target_relation.oid
                     AND attribute.attnum = key_column.attnum
                   ORDER BY key_column.ordinality) AS target_columns,
            pg_get_constraintdef(constraint_row.oid) AS definition
       FROM pg_constraint AS constraint_row
       JOIN pg_class AS source_relation ON source_relation.oid = constraint_row.conrelid
       JOIN pg_namespace AS source_namespace ON source_namespace.oid = source_relation.relnamespace
       JOIN pg_class AS target_relation ON target_relation.oid = constraint_row.confrelid
       JOIN pg_namespace AS target_namespace ON target_namespace.oid = target_relation.relnamespace
      WHERE constraint_row.contype = 'f'
        AND ((source_namespace.nspname = 'public' AND source_relation.relname = ANY($1::text[]))
          OR (source_namespace.nspname = 'moc_private' AND source_relation.relname = ANY($2::text[])))
      ORDER BY source_namespace.nspname, source_relation.relname, constraint_row.conname`,
    [publicTables, ['integration_oauth_tokens']],
  );
}

export async function dropForeignKeys(client, constraints) {
  for (const constraint of constraints) {
    await client.query(
      `ALTER TABLE ${qualifiedName(constraint.source_schema, constraint.source_table)} DROP CONSTRAINT ${quoteIdentifier(constraint.conname)}`,
    );
  }
}

export async function restoreForeignKeys(client, constraints) {
  for (const constraint of constraints) {
    await client.query(
      `ALTER TABLE ${qualifiedName(constraint.source_schema, constraint.source_table)} ADD CONSTRAINT ${quoteIdentifier(constraint.conname)} ${constraint.definition}`,
    );
  }
}

export async function verifyForeignKeys(target) {
  const constraints = await getForeignKeys(target);
  for (const constraint of constraints.rows) {
    const sourceName = qualifiedName(constraint.source_schema, constraint.source_table);
    const targetName = qualifiedName(constraint.target_schema, constraint.target_table);
    const equalities = constraint.source_columns.map((column, index) =>
      `referencing.${quoteIdentifier(column)} = referenced.${quoteIdentifier(constraint.target_columns[index])}`);
    const allSet = constraint.source_columns.map((column) => `referencing.${quoteIdentifier(column)} IS NOT NULL`).join(' AND ');
    let missingCondition = `(${allSet}) AND NOT EXISTS (SELECT 1 FROM ${targetName} AS referenced WHERE ${equalities.join(' AND ')})`;
    if (constraint.match_type === 'f') {
      const anySet = constraint.source_columns.map((column) => `referencing.${quoteIdentifier(column)} IS NOT NULL`).join(' OR ');
      missingCondition = `(((${anySet}) AND NOT (${allSet})) OR ((${allSet}) AND NOT EXISTS (SELECT 1 FROM ${targetName} AS referenced WHERE ${equalities.join(' AND ')})))`;
    }
    const invalid = await target.query(`SELECT EXISTS (SELECT 1 FROM ${sourceName} AS referencing WHERE ${missingCondition}) AS invalid`);
    if (invalid.rows[0].invalid) throw new Error(`Foreign-key verification failed for ${constraint.conname}`);
  }
}
