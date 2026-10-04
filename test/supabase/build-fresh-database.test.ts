import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('fresh database build skips historical scripts and preserves upgrade history IDs', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'moc-migration-build-'));
  const log = join(scratch, 'calls.log');
  writeFileSync(join(scratch, 'psql'), `#!/usr/bin/env python3
import json, os, sys
if '-f' in sys.argv and not os.path.isfile(sys.argv[sys.argv.index('-f') + 1]):
    sys.exit(1)
with open(os.environ['MOC_BUILD_LOG'], 'a') as log:
    log.write(json.dumps(sys.argv[1:]) + '\\n')
if '-f' not in sys.argv:
    sys.stdin.read()
`, { mode: 0o755 });
  try {
    const result = spawnSync('bash', [resolve('supabase/build-fresh-database.sh'), 'postgresql://fixture'], {
      env: { ...process.env, PATH: `${scratch}:${process.env.PATH}`, MOC_BUILD_LOG: log },
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    const calls: string[][] = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[]);
    const files = calls.filter(args => args.includes('-f')).map(args => args[args.indexOf('-f') + 1].split('/').at(-1));
    expect(files.slice(0, 4)).toEqual([
      'phase-01-schema.sql', 'phase-02-logic.sql', 'phase-03-security.sql',
      '2026-08-04-moc-console-target-schema-cleanup.sql',
    ]);
    expect(files[4]).toBe('2026-08-05a-api-reliability-hardening.sql');
    expect(files.at(-1)).toBe('2026-10-04a-scheduled-message-date.sql');
    expect(files).not.toContain('2026-05-16-media-intrinsic-metadata.sql');
    expect(files).not.toContain('2026-08-04-consolidated-live-schema-update.sql');
    expect(files.indexOf('2026-09-27c-venue-booking-approval-states.sql')).toBeLessThan(
      files.indexOf('2026-09-27d-venue-booking-approval-and-telegram-actions.sql'));
    const versions = calls.flatMap(args => args.filter(arg => arg.startsWith('version=')));
    expect(versions).toHaveLength(31);
    expect(versions.slice(0, 2)).toEqual(['version=20260805120000', 'version=20260805130000']);
    expect(versions.at(-1)).toBe('version=20261004080000');
    expect(calls.some(args => args.includes('name=remove_expected_arrival'))).toBe(true);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}, 15000);
