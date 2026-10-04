import { describe, expect, test } from 'bun:test'
import { renderScheduledMessage, validateScheduledFields, validateScheduledBody, SCHEDULED_DEFAULT_BODIES } from '../../../../packages/notifications/src/scheduled-message'

describe('scheduled message fields and rendering', () => {
 test.each(['announcement','pre_attendance'] as const)('renders %s dates with the converted year without changing stored values', messageType => {
  const fields=validateScheduledFields(messageType,{title:'Service',date:'2026-10-04'})
  validateScheduledBody(messageType,'{{title}}\n{{date}}')
  const result=renderScheduledMessage({id:'abc',messageType,body:'{{title}}\n{{date}}',fields,requireArrival:false},[],false)
  expect(result.text).toBe('Service\n431004')
  expect(fields.date).toBe('2026-10-04')
 })
 test.each(['2026-02-29','2026-04-31','2026-13-04','04/10/43','2026-10-04T07:30','0000-01-01'])('rejects invalid date-only field %s', date => {
  expect(() => validateScheduledFields('announcement',{title:'Service',date})).toThrow()
 })
 test('allows an optional empty date and valid leap day', () => {
  const input={id:'abc',messageType:'announcement' as const,body:'{{title}}\n{{date}}',fields:{title:'Service',date:''},requireArrival:false}
  expect(renderScheduledMessage({...input,fields:validateScheduledFields(input.messageType,input.fields)},[],false).text).toBe('Service')
  expect(renderScheduledMessage({...input,fields:validateScheduledFields(input.messageType,{title:'Service',date:'2028-02-29'})},[],false).text).toBe('Service\n450229')
  expect(renderScheduledMessage({...input,fields:validateScheduledFields(input.messageType,{title:'Service',date:'1984-01-04'})},[],false).text).toBe('Service\n010104')
 })
 test('rejects generated fields and the retired expected arrival field', () => {
  expect(() => validateScheduledFields('pre_attendance', { title: 'Service', attendeeList: 'Fake' })).toThrow()
  expect(() => validateScheduledFields('pre_attendance', { title: 'Service', expectedArrival: '07:30' })).toThrow()
  expect(() => validateScheduledBody('pre_attendance', '{{title}}\n{{expectedArrival}}')).toThrow()
 })
 test('default pre-attendance renders only its title and instructions', () => {
  const fields = validateScheduledFields('pre_attendance', { title: 'Service', instructions: 'Please arrive by 07:00.' })
  const body = SCHEDULED_DEFAULT_BODIES.pre_attendance
  validateScheduledBody('pre_attendance', body)
  const result = renderScheduledMessage({ id: 'abc', messageType: 'pre_attendance', body, fields, requireArrival: true }, [], false)
  expect(result.text).toBe('<b>Service</b>\nPlease arrive by 07:00.')
 })
 test('renders edited instructions without destroying personal arrival times', () => {
  const result = renderScheduledMessage({ id: 'abc', messageType: 'pre_attendance', body: '{{title}}\n{{instructions}}', fields: {title:'Service', instructions:'Arrive earlier'}, requireArrival: true }, [{name:'Craig',status:'attending',arrivalTime:'07:30'}], false)
  expect(result.text).toContain('Arrive earlier')
  expect(result.text).toContain('✅ Craig — 07:30')
  expect(result.replyMarkup?.inline_keyboard.flat().map(b => b.text)).toEqual(['Attending','Not attending'])
 })
 test('expired render removes all actions and escapes replacements', () => {
  const result=renderScheduledMessage({id:'abc',messageType:'announcement',body:'{{title}}',fields:{title:'<unsafe>'},requireArrival:false},[],true)
  expect(result.text).toContain('&lt;unsafe&gt;')
  expect(result.replyMarkup).toBeNull()
 })
 test.each([
  { status: 'awaiting' as const, arrivalTime: null, requireArrival: true, expected: '🔁 Port Elizabeth' },
  { status: 'not_attending' as const, arrivalTime: '07:30', requireArrival: true, expected: '❌ Port Elizabeth' },
  { status: 'attending' as const, arrivalTime: null, requireArrival: true, expected: '✅ Port Elizabeth' },
  { status: 'attending' as const, arrivalTime: null, requireArrival: false, expected: '✅ Port Elizabeth' },
  { status: 'attending' as const, arrivalTime: '07:30', requireArrival: true, expected: '✅ Port Elizabeth — 07:30' },
 ])('renders compact attendee row: $expected', ({status,arrivalTime,requireArrival,expected}) => {
  const result=renderScheduledMessage({id:'abc',messageType:'pre_attendance',body:'',fields:{},requireArrival},[{name:'Port Elizabeth',status,arrivalTime}],false)
  expect(result.text).toBe(expected)
 })
 test('escapes attendee names while keeping the attendance icon first', () => {
  const result=renderScheduledMessage({id:'abc',messageType:'pre_attendance',body:'',fields:{},requireArrival:false},[{name:'<Port & Elizabeth>',status:'awaiting',arrivalTime:null}],false)
  expect(result.text).toBe('🔁 &lt;Port &amp; Elizabeth&gt;')
 })
})


test('keeps only initial actions on the shared card even when some attendees have responded', () => {
 const input={id:'abc',messageType:'pre_attendance' as const,body:'{{title}}',fields:{title:'Service'},requireArrival:false}
 for (const responses of [[],[{name:'Alex',status:'attending' as const,arrivalTime:null},{name:'Sam',status:'awaiting' as const,arrivalTime:null}]]) {
  expect(renderScheduledMessage(input,responses,false).replyMarkup).toEqual({inline_keyboard:[[
   {text:'Attending',callback_data:'sa:yes:abc'}, {text:'Not attending',callback_data:'sa:no:abc'},
  ]]})
 }
})
