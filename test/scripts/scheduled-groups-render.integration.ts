import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { renderScheduledMessage } from '../../packages/notifications/src/scheduled-message.ts'

type RendererSnapshot = {
  input: Parameters<typeof renderScheduledMessage>[0]
  responses: Parameters<typeof renderScheduledMessage>[1]
  telegramMessageId: number
}

const file = process.argv[2]
if (!file) throw new Error('Pass the JSON snapshot produced by the local PostgreSQL probe')
const snapshot = JSON.parse(readFileSync(file, 'utf8')) as RendererSnapshot
const response = snapshot.responses.find(item => item.name === 'Val Viewer')
assert.ok(response, 'the SQL respondent should return the eligible fixture attendee')
assert.equal(response.status, 'attending')
assert.equal(response.groupId, '00000000-0000-4000-8000-000000000011')
assert.equal(response.arrivalTime, '09:15')
assert.equal(snapshot.input.fields.title, 'Updated service')
assert.equal(snapshot.input.attendanceGroups?.[0]?.label, 'North Wing')
assert.equal(snapshot.telegramMessageId, 77441, 'administrator edits must retain the original Telegram message identity')

const rendered = renderScheduledMessage(snapshot.input, snapshot.responses, false)
assert.match(rendered.text, /<b>North Wing:<\/b>\n✅ Val Viewer — 09:15/)
assert.match(rendered.text, /<b>Awaiting response:<\/b>/)
console.log('PASS: real SQL occurrence and respondent rows rendered in their selected group after scoped edits; original Telegram message ID retained.')
