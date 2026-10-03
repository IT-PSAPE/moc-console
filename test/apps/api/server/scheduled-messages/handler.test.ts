import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ApiRequest, ApiResponse } from '../../../../../apps/api/server/http.js'
import { handleScheduledMessages } from '../../../../../apps/api/server/scheduled-messages/handler.js'

async function requestWithoutSession(method: string, origin?: string): Promise<{ status: number; body: unknown }> {
  let status = 200
  let body: unknown
  const response: ApiResponse = {
    status(code) { status = code; return response },
    json(value) { body = value },
    setHeader() {},
  }
  const request: ApiRequest = { method, headers: origin === undefined ? {} : { origin } }
  await handleScheduledMessages(request, response)
  return { status, body }
}

describe('scheduled message browser origin checks', () => {
  it('requires authentication for same-origin GET requests without an Origin header', async () => {
    assert.deepEqual(await requestWithoutSession('GET'), {
      status: 401, body: { error: 'Missing session token' },
    })
  })

  it('rejects explicit untrusted origins on reads', async () => {
    assert.deepEqual(await requestWithoutSession('GET', 'https://untrusted.example'), {
      status: 403, body: { error: 'Forbidden origin' },
    })
  })

  it('rejects writes without an Origin header', async () => {
    assert.deepEqual(await requestWithoutSession('POST'), {
      status: 403, body: { error: 'Forbidden origin' },
    })
  })
})
