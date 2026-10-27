import { createECDH } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from 'vitest'

test('generates a matching VAPID pair into an owner-only file and refuses replacement', () => {
  const directory = mkdtempSync(join(tmpdir(), 'moc-vapid-'))
  const path = join(directory, 'push.env')
  const script = resolve('apps/api/scripts/generate-web-push-keys.ts')
  try {
    const output = execFileSync(process.execPath, [script, path, 'mailto:ops@example.test'], { encoding: 'utf8' })
    const contents = readFileSync(path, 'utf8')
    const values = Object.fromEntries(contents.trim().split('\n').map((line) => line.split('=')))
    const ecdh = createECDH('prime256v1')
    ecdh.setPrivateKey(Buffer.from(values.WEB_PUSH_VAPID_PRIVATE_KEY, 'base64url'))
    expect(ecdh.getPublicKey().toString('base64url')).toBe(values.WEB_PUSH_VAPID_PUBLIC_KEY)
    expect(values.WEB_PUSH_VAPID_SUBJECT).toBe('mailto:ops@example.test')
    expect(statSync(path).mode & 0o777).toBe(0o600)
    expect(output).not.toContain(values.WEB_PUSH_VAPID_PRIVATE_KEY)
    expect(() => execFileSync(process.execPath, [script, path, 'mailto:ops@example.test'], { stdio: 'pipe' })).toThrow()
    expect(readFileSync(path, 'utf8')).toBe(contents)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
