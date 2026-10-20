import { expect, test } from 'vitest'
import { AUTH_EMAIL_LINK_LIFETIME_SECONDS, renderAuthEmail } from '../../../../packages/backend/src/auth/email-template'

const link = 'https://console.example.test/api/auth/verify-email?token=opaque&callbackURL=https%3A%2F%2Fconsole.example.test%2Flogin%3Fauth%3Dverified'

test('verification email has the same actionable link in HTML and plain text', () => {
  const email = renderAuthEmail('verification', link)
  expect(email.subject).toBe('Verify your MoC email')
  expect(email.text).toContain(link)
  expect(email.html.match(/href="([^"]+)"/g)).toEqual([`href="${link.replaceAll('&', '&amp;')}"`, `href="${link.replaceAll('&', '&amp;')}"`])
  expect(email.html).toContain('Verify email</a>')
  expect(email.html).toContain('MOC Console')
  expect(email.html).not.toContain('token_hash')
  expect(email.html).not.toContain('supabase.co')
})

test('reset emails preserve the token endpoint and explain that clicking alone does not change a password', () => {
  const url = 'http://localhost:5173/api/auth/reset-password/opaque?callbackURL=http%3A%2F%2Flocalhost%3A5173%2Fpassword-recovery'
  const email = renderAuthEmail('password-reset', url)
  expect(email.subject).toBe('Reset your MoC password')
  expect(email.text).toContain(url)
  expect(email.html).toContain(`href="${url}"`)
  expect(email.html).toContain('choose and save a new one')
  expect(email.html).toContain('This link expires in 1 hour.')
  expect(AUTH_EMAIL_LINK_LIFETIME_SECONDS).toBe(3600)
})

test('HTML link attributes escape ampersands and quotes', () => {
  const email = renderAuthEmail('verification', 'https://console.example.test/api/auth/verify-email?token=abc&label="onclick="alert(1)')
  expect(email.html).not.toContain('"onclick=')
  expect(email.html).toContain('&amp;label=')
  expect(email.html).toContain('%22onclick=')
})

test.each(['javascript:alert(1)', 'data:text/html,unsafe', 'https://user:password@example.test/'])('rejects unsafe authentication links: %s', url => {
  expect(() => renderAuthEmail('verification', url)).toThrow('Invalid authentication email link')
})
