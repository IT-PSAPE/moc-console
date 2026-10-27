import { beforeEach, expect, test, vi } from 'vitest'
import consolePush from '../../neon/functions/console-push'
import { processPendingConsolePushDeliveries } from '../../apps/api/server/push/delivery-store'

vi.mock('../../apps/api/server/push/delivery-store', () => ({ processPendingConsolePushDeliveries: vi.fn() }))
beforeEach(() => vi.clearAllMocks())

function invocation(name = 'moc-console-push-minutely'): Request {
  return new Request('https://console-push.test/', {
    method: 'POST',
    headers: { 'x-neon-trigger-invocation-id': 'push-invocation' },
    body: JSON.stringify({ version: 1, invocation_id: 'push-invocation', trigger: { type: 'schedule', name, id: 'trigger-id' } }),
  })
}

test('rejects requests without the dedicated Neon schedule envelope', async () => {
  expect((await consolePush(new Request('https://console-push.test/'))).status).toBe(405)
  expect((await consolePush(new Request('https://console-push.test/', { method: 'POST', body: '{}' }))).status).toBe(403)
  expect((await consolePush(invocation('moc-notification-deliveries-daily'))).status).toBe(403)
  expect(processPendingConsolePushDeliveries).not.toHaveBeenCalled()
})

test('processes the durable push queue from its named Neon trigger', async () => {
  const deliveries = { attempted: 1, sent: 1, failed: 0, pendingRetry: 0 }
  vi.mocked(processPendingConsolePushDeliveries).mockResolvedValue(deliveries)
  const response = await consolePush(invocation())
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ ok: true, invocationId: 'push-invocation', deliveries })
})

test('returns a sanitized error if the delivery worker fails', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(processPendingConsolePushDeliveries).mockRejectedValue(new Error('private endpoint and key'))
  const response = await consolePush(invocation())
  expect(response.status).toBe(500)
  expect(await response.json()).toEqual({ error: 'Failed to process Console push deliveries' })
  expect(log).toHaveBeenCalledWith('Console push delivery trigger failed')
  log.mockRestore()
})
