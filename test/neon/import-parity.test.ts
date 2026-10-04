import { describe, expect, test } from 'bun:test';

const sourceUrl = process.env.MOC_IMPORT_SOURCE_DATABASE_URL;
const targetUrl = process.env.MOC_IMPORT_TARGET_DATABASE_URL;

describe.skipIf(!sourceUrl || !targetUrl)('Neon import parity tool', () => {
  test('compares domain table counts and fingerprints without printing rows', () => {
    if (!sourceUrl || !targetUrl) throw new Error('Import fixture URLs were not configured');
    const result = Bun.spawnSync(['node', 'neon/database/verify-import-parity.mjs'], {
      env: {
        ...process.env,
        LEGACY_SOURCE_DATABASE_URL: sourceUrl,
        NEON_DATABASE_URL: targetUrl,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = result.stdout.toString();
    expect(result.exitCode).toBe(0);
    expect(output).toContain('MATCH public.users:');
    expect(output).toContain('MATCH public.scheduled_message_templates:');
    expect(output).toContain('MATCH private.integration_oauth_tokens:');
    expect(output).not.toContain('password');
    expect(`${output}${result.stderr.toString()}`).not.toContain(sourceUrl);
    expect(`${output}${result.stderr.toString()}`).not.toContain(targetUrl);
  });
});
