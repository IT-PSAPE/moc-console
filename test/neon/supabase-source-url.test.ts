import { expect, test } from 'vitest'

const { validatedSupabaseSourceUrl } = await import('../../neon/database/supabase-source-url.mjs') as {
  validatedSupabaseSourceUrl: (value: string | undefined) => URL
}
const source = 'jypshhgfuvwmtbbcxmhs.supabase.co'

test('accepts the selected HTTPS source project root', () => {
  expect(validatedSupabaseSourceUrl(`https://${source}`).origin).toBe(`https://${source}`)
})

test.each([
  undefined, 'invalid', `http://${source}`, 'https://another-project.supabase.co',
  `https://${source}.example.test`, `https://${source}:8443`,
  `https://user:password@${source}`, `https://${source}?redirect=1`,
  `https://${source}#fragment`, `https://${source}/another/path`,
])('rejects unapproved source URLs without exposing their value', value => {
  expect(() => validatedSupabaseSourceUrl(value)).toThrow('SUPABASE_URL does not identify the selected source project')
})
