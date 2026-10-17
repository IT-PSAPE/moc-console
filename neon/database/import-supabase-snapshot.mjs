import { Pool } from 'pg';
import { targetState } from './supabase-snapshot-target-state.mjs';
import { validateSnapshotTarget } from './supabase-snapshot-db-contract.mjs';
import { verifySourceFingerprints } from './supabase-snapshot-db-parity.mjs';
import { createPlan, readPlan, safeReport, writePrivateJson } from './supabase-snapshot-import-plan.mjs';
import { applyPlan } from './supabase-snapshot-import-transfer.mjs';
import { readAndValidateSnapshot } from './supabase-snapshot-validation.mjs';

function databaseUrl() {
  const value = process.env.NEON_DATABASE_URL;
  if (!value) throw new Error('NEON_DATABASE_URL is required');
  try {
    if (!['postgres:', 'postgresql:'].includes(new URL(value).protocol)) throw new Error();
  } catch {
    throw new Error('NEON_DATABASE_URL must be a PostgreSQL URL');
  }
  return value;
}

function optionsFromArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--apply') options.apply = true;
    else if (args[index] === '--confirm-replace-target') options.confirmReplace = true;
    else if (args[index] === '--snapshot') options.snapshotPath = args[++index];
    else if (args[index] === '--plan') options.planPath = args[++index];
    else throw new Error(`Unknown argument: ${args[index]}`);
  }
  if (!options.snapshotPath || !options.planPath) throw new Error('Usage: node neon/database/import-supabase-snapshot.mjs --snapshot <source-snapshot.json> --plan <target-plan.json> [--apply --confirm-replace-target]');
  if (Boolean(options.apply) !== Boolean(options.confirmReplace)) throw new Error('Applying requires both --apply and --confirm-replace-target');
  return options;
}

async function run() {
  const options = optionsFromArgs(process.argv.slice(2));
  const source = await readAndValidateSnapshot(options.snapshotPath);
  const pool = new Pool({ connectionString: databaseUrl(), max: 1, connectionTimeoutMillis: 5_000 });
  let client;
  try {
    client = await pool.connect();
    await client.query("SET TIME ZONE 'UTC'");
    if (options.apply) {
      const plan = await readPlan(options.planPath);
      if (plan.snapshotSha256 !== source.digest) throw new Error('Snapshot hash does not match the reviewed plan');
      await validateSnapshotTarget(client, source.snapshot, source.validation);
      await applyPlan(client, source.snapshot, source.validation, source.digest, plan);
      process.stdout.write(`Import committed for ${Object.keys(source.validation.rowCounts).length} source tables and ${source.snapshot.authUsers.length} auth users.\n`);
      return;
    }
    await validateSnapshotTarget(client, source.snapshot, source.validation);
    await verifySourceFingerprints(client, source.validation);
    const state = await targetState(client);
    const plan = createPlan(source.snapshot, source.validation, source.digest, state);
    await writePrivateJson(options.planPath, plan);
    const report = safeReport(plan);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } finally {
    client?.release();
    await pool.end();
  }
}

run().catch((error) => {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' ? ` (${error.code})` : '';
  const message = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[database URL redacted]') : 'unknown failure';
  process.stderr.write(`Snapshot import failed${code}: ${message}\n`);
  process.exitCode = 1;
});
