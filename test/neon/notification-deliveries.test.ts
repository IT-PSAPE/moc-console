import { expect, test } from 'bun:test'
import notificationDeliveries from '../../neon/functions/notification-deliveries'

test('notification-deliveries rejects requests without the named Neon schedule envelope', async () => {
  const response = await notificationDeliveries(new Request('https://neon-function.test/', { method: 'POST', body: '{}' }))

  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({ error: 'Invalid scheduled trigger invocation' })
})
