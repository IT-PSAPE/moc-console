import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

const sourceUrl = process.env.MOC_IMPORT_SOURCE_DATABASE_URL;
const targetUrl = process.env.MOC_IMPORT_TARGET_DATABASE_URL;

describe.skipIf(!sourceUrl || !targetUrl)('Neon import parity tool', () => {
  test('compares domain table counts and fingerprints without printing rows', () => {
    if (!sourceUrl || !targetUrl) throw new Error('Import fixture URLs were not configured');
    const result = spawnSync(process.execPath, ['neon/database/verify-import-parity.mjs'], {
      env: {
        ...process.env,
        LEGACY_SOURCE_DATABASE_URL: sourceUrl,
        NEON_DATABASE_URL: targetUrl,
      },
      stdio: 'pipe',
      encoding: 'utf8',
    });
    const output = result.stdout ?? '';
    expect(result.status).toBe(0);
    expect(output).toContain('MATCH public.users:');
    expect(output).toContain('MATCH public.scheduled_message_templates:');
    expect(output).toContain('MATCH private.integration_oauth_tokens:');
    expect(output).not.toContain('password');
    expect(`${output}${result.stderr ?? ''}`).not.toContain(sourceUrl);
    expect(`${output}${result.stderr ?? ''}`).not.toContain(targetUrl);
  });
});
