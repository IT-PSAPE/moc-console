import { expect, test } from 'vitest'
import { readScheduledTrigger } from '../../neon/functions/trigger-envelope'

test('scheduled handlers require Neon provenance and a matching invocation envelope', async () => {
  const valid = { version: 1, invocation_id: 'invoke-1', trigger: { type: 'schedule', id: 'trigger-1', name: 'moc-weekly-archive' }, data: {} }
  const request = (body: unknown, id?: string) => new Request('https://neon-function.test/', {
    method: 'POST', headers: id ? { 'x-neon-trigger-invocation-id': id } : {}, body: JSON.stringify(body),
  })

  expect(await readScheduledTrigger(request(valid, 'invoke-1'), 'moc-weekly-archive')).toEqual(valid)
  expect(await readScheduledTrigger(request(valid), 'moc-weekly-archive')).toBeNull()
  expect(await readScheduledTrigger(request({ ...valid, invocation_id: 'forged' }, 'invoke-1'), 'moc-weekly-archive')).toBeNull()
  expect(await readScheduledTrigger(request(valid, 'invoke-1'), 'moc-scheduled-messages-hourly')).toBeNull()
})
