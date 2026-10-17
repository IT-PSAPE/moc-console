import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { canonicalJson } from './supabase-snapshot-validation.mjs';

export function safeReport(plan) {
  return {
    projectId: plan.projectId,
    exportedAt: plan.exportedAt,
    target: plan.target.databaseName,
    sourceTableCount: Object.keys(plan.sourceCounts).length,
    sourceRows: Object.values(plan.sourceCounts).reduce((sum, value) => sum + value, 0),
    sourceAuthUsers: plan.sourceAuthUsers,
    storageBuckets: plan.storageBucketCount,
    storageObjects: plan.storageObjectCount,
    targetNonemptyTables: Object.entries(plan.target.counts).filter(([, count]) => count > 0).map(([name, count]) => `${name}=${count}`),
    targetAuthUsers: plan.target.authCounts.user,
    targetSessionsToClear: plan.target.authCounts.session,
    targetFingerprint: plan.target.fingerprint,
    snapshotSha256: plan.snapshotSha256,
    planSha256: plan.planSha256,
  };
}

export function createPlan(snapshot, validation, snapshotDigest, target) {
  const plan = {
    planVersion: 1,
    projectId: snapshot.projectId,
    exportedAt: snapshot.exportedAt,
    snapshotSha256: snapshotDigest,
    sourceCounts: validation.rowCounts,
    sourceAuthUsers: snapshot.authUsers.length,
    storageBucketCount: snapshot.storageBuckets.length,
    storageObjectCount: snapshot.storageObjects.length,
    target: {
      databaseName: target.identity.database_name,
      serverAddress: target.identity.server_address,
      serverPort: target.identity.server_port,
      counts: target.counts,
      authCounts: target.authCounts,
      fingerprint: target.fingerprint,
    },
  };
  plan.planSha256 = createHash('sha256').update(canonicalJson(plan)).digest('hex');
  return plan;
}

export async function writePrivateJson(path, value) {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true, mode: 0o700 });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await chmod(absolutePath, 0o600);
}

export async function readPlan(path) {
  let plan;
  try {
    plan = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new Error('Plan file is not valid JSON');
  }
  if (!plan || plan.planVersion !== 1 || typeof plan.snapshotSha256 !== 'string' || typeof plan.planSha256 !== 'string') {
    throw new Error('Plan file is invalid');
  }
  const { planSha256, ...unsigned } = plan;
  if (createHash('sha256').update(canonicalJson(unsigned)).digest('hex') !== planSha256) throw new Error('Plan file integrity check failed');
  return plan;
}
