import { describe, expect, test } from 'bun:test';

const sourceUrl = process.env.MOC_IMPORT_SOURCE_DATABASE_URL;
const targetUrl = process.env.MOC_IMPORT_TARGET_DATABASE_URL;

describe.skipIf(!sourceUrl || !targetUrl)('Neon domain data import preflight', () => {
  test('dry-run validates the complete table allowlist without writing or printing credentials', () => {
    if (!sourceUrl || !targetUrl) throw new Error('Import fixture URLs were not configured');
    const result = Bun.spawnSync(['node', 'neon/database/import-domain-data.mjs'], {
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
    expect(output).toContain('DRY RUN validated 49 domain tables');
    expect(output).toContain('READY public.users:');
    expect(output).toContain('READY public.api_rate_limit_windows:');
    expect(output).toContain('READY public.notification_ingest_replays:');
    expect(output).toContain('READY public.zoom_meetings:');
    expect(output).toContain('READY private.integration_oauth_tokens:');
    expect(`${output}${result.stderr.toString()}`).not.toContain(sourceUrl);
    expect(`${output}${result.stderr.toString()}`).not.toContain(targetUrl);
  });
});
