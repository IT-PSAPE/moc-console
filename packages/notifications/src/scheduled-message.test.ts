import { describe, expect, test } from 'bun:test'
import { renderScheduledMessage, validateScheduledFields } from './scheduled-message'

describe('scheduled message fields and rendering', () => {
 test('rejects generated attendance fields and invalid arrival times', () => {
  expect(() => validateScheduledFields('pre_attendance', { title: 'Service', attendeeList: 'Fake' })).toThrow()
  expect(() => validateScheduledFields('pre_attendance', { title: 'Service', expectedArrival: '25:30' })).toThrow()
 })
 test('renders edited instructions without destroying personal arrival times', () => {
  const result = renderScheduledMessage({ id: 'abc', messageType: 'pre_attendance', body: '{{title}}\n{{instructions}}\n{{expectedArrival}}', fields: {title:'Service', instructions:'Arrive earlier', expectedArrival:'07:00'}, requireArrival: true }, [{name:'Craig',status:'attending',arrivalTime:'07:30'}], false)
  expect(result.text).toContain('Arrive earlier')
  expect(result.text).toContain('Craig — ✅ Attending · 07:30')
  expect(result.replyMarkup?.inline_keyboard.flat().map(b => b.text)).toContain('Update response')
 })
 test('expired render removes all actions and escapes replacements', () => {
  const result=renderScheduledMessage({id:'abc',messageType:'announcement',body:'{{title}}',fields:{title:'<unsafe>'},requireArrival:false},[],true)
  expect(result.text).toContain('&lt;unsafe&gt;')
  expect(result.replyMarkup).toBeNull()
 })
})
