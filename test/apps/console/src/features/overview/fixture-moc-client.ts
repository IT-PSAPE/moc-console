import { createMocClient } from '@moc/sdk'
import { readFixtureRole } from './fixture-role'

const fixtureFetch: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers)
  headers.set('X-Overview-Fixture-Role', readFixtureRole())
  return fetch(input, { ...init, headers })
}
export const moc = createMocClient('', { fetchImpl: fixtureFetch })
