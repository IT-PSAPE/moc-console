import { expect, test } from 'vitest'
import { authConfigurationIssues, getAuthConfiguration } from '../../../../packages/backend/src/auth/configuration'

const production = {
  NODE_ENV: 'production', MOC_AUTH_PUBLIC_BASE_URL: 'https://console.example.test',
  MOC_CONSOLE_ORIGIN: 'https://console.example.test', MOC_AUTH_TRUSTED_ORIGINS: 'https://console.example.test',
}

test('production requires an explicit public email-link origin', () => {
  expect(() => getAuthConfiguration({ NODE_ENV: 'production' })).toThrow('MOC_AUTH_PUBLIC_BASE_URL')
})

test('production uses the Console origin and secure cookies', () => {
  expect(getAuthConfiguration(production)).toEqual({ publicBaseUrl: production.MOC_CONSOLE_ORIGIN, trustedOrigins: [production.MOC_CONSOLE_ORIGIN], secureCookies: true })
})

test('rejects auth links pointing at a different origin or port from the Console', () => {
  expect(authConfigurationIssues({ MOC_AUTH_PUBLIC_BASE_URL: 'http://localhost:5180', MOC_CONSOLE_ORIGIN: 'http://localhost:5173' })).toEqual(['MOC_AUTH_PUBLIC_BASE_URL', 'MOC_CONSOLE_ORIGIN'])
})

test('supports an explicitly configured local authdev service without insecure production cookies', () => {
  const origin = 'http://localhost:5173'
  expect(getAuthConfiguration({ NODE_ENV: 'production', MOC_AUTH_PUBLIC_BASE_URL: origin, MOC_CONSOLE_ORIGIN: origin, MOC_AUTH_TRUSTED_ORIGINS: origin }).secureCookies).toBe(false)
  expect(() => getAuthConfiguration({ ...production, MOC_AUTH_COOKIE_SECURE: 'false' })).toThrow('MOC_AUTH_COOKIE_SECURE')
})

test('the generated email-link origin must be trusted and origins cannot contain paths or credentials', () => {
  expect(authConfigurationIssues({ ...production, MOC_AUTH_TRUSTED_ORIGINS: 'https://other.example.test' })).toContain('MOC_AUTH_TRUSTED_ORIGINS')
  for (const origin of ['https://console.example.test/api', 'https://user:password@console.example.test', 'http://public.example.test']) {
    expect(authConfigurationIssues({ ...production, MOC_AUTH_PUBLIC_BASE_URL: origin })).toContain('MOC_AUTH_PUBLIC_BASE_URL')
  }
})
