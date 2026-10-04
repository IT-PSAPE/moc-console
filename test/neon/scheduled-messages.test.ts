import { expect, test as runnerTest } from 'vitest'
import { runWithSqlFixture, setSqlFixture } from '../apps/api/server/sql-fixture.js'

function test(name:string,body:()=>Promise<void>):void { runnerTest(name,()=>runWithSqlFixture(async()=>{setSqlFixture({queryRows:async(text:string)=>{sql.push(text);return []},queryActor:async(text:string)=>{sql.push(text);return []}});await body()})) }

const sql: string[] = []
const { default: handler } = await import('../../neon/functions/scheduled-messages')

function payload(name: string, invocationId = 'invoke-1') {
  return { version: 1, invocation_id: invocationId, trigger: { type: 'schedule', id: 'trigger-1', name }, data: {} }
}

test('scheduled worker rejects requests without Neon trigger provenance before database work', async () => {
  sql.length = 0
  const response = await handler(new Request('https://function.test/', { method: 'POST', body: JSON.stringify(payload('moc-scheduled-messages-hourly')) }))
  expect(response.status).toBe(403)
  expect(sql).toEqual([])
})

test('scheduled worker executes SQL preparation and queue selection only for the expected trigger', async () => {
  sql.length = 0
  const response = await handler(new Request('https://function.test/', {
    method: 'POST', headers: { 'x-neon-trigger-invocation-id': 'invoke-1' },
    body: JSON.stringify(payload('moc-scheduled-messages-hourly')),
  }))
  expect(response.status).toBe(200)
  expect(sql.some(statement => statement.includes('recover_scheduled_deliveries'))).toBe(true)
  expect(sql.some(statement => statement.includes('prepare_scheduled_messages'))).toBe(true)
  expect(sql.some(statement => statement.includes('scheduled_occurrence_id IS NOT NULL'))).toBe(true)
})
