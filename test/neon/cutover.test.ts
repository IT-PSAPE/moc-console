import { expect, test } from 'bun:test'
import { checkCutoverEnvironment } from '../../neon/scripts/check-cutover'

test('cutover preflight rejects missing configuration without echoing secrets', () => {
  const report = checkCutoverEnvironment({BETTER_AUTH_SECRET:'short',NEON_PROJECT_ID:'unrelated',MOC_ENABLE_PRODUCTION_JOBS:'true',MOC_NEON_BRANCH:'preview'})
  expect(report.missing).toContain('NEON_DATABASE_URL')
  expect(report.missing).not.toContain('LEGACY_SOURCE_DATABASE_URL')
  expect(report.invalid).toEqual(['NEON_PROJECT_ID','BETTER_AUTH_SECRET','MOC_NEON_BRANCH'])
  expect(JSON.stringify(report)).not.toContain('short')
})

test('cutover preflight accepts Frankfurt target and live auth/email settings', () => {
  const report = checkCutoverEnvironment({
    NEON_DATABASE_URL: 'postgresql://user:pass@localhost/db',
    NEON_PROJECT_ID: 'blue-wind-16947728',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    MOC_AUTH_SERVICE_SECRET: 'b'.repeat(32),
    MOC_AUTH_TRUSTED_ORIGINS: 'https://console.example.test',
    MOC_AUTH_PUBLIC_BASE_URL: 'https://console.example.test',
    MOC_CONSOLE_ORIGIN: 'https://console.example.test',
    SMTP_HOST: 'smtp.example.test',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'password',
    SMTP_FROM: 'auth@example.test',
  })
  expect(report).toEqual({ missing: [], invalid: [] })
})
