import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { renderScheduledMessage, renderTemplate, type ScheduledOccurrence } from '@moc/notifications'

type ResponseRow = { name: string; status: 'awaiting' | 'attending' | 'not_attending'; arrival_time: string | null; decline_reason: string | null; group_id: string | null; checked_in_at: string | null }
type Bridge = {
    posts: { occurrence: ScheduledOccurrence; timezone: string; responses: ResponseRow[] }[]
    legacy: { source: { body: string; fields: Record<string, string>; expires_at: string }; body: string; timezone: string }[]
}
const bridge = JSON.parse(await readFile(process.argv[2], 'utf8')) as Bridge
assert.equal(bridge.posts.length, 2)
for (const { occurrence, timezone, responses } of bridge.posts) {
    assert.equal(responses.length, 1)
    const rendered = renderScheduledMessage({ id: occurrence.id, messageType: occurrence.message_type, body: occurrence.body, postRole: occurrence.post_role, legacyClosed: occurrence.legacy_closed, attendanceGroups: occurrence.attendance_groups, timezone }, responses.map(row => ({ name: row.name, status: row.status, arrivalTime: row.arrival_time, declineReason: row.decline_reason, groupId: row.group_id, checkedInAt: row.checked_in_at })))
    assert.ok(rendered.text.includes('<b>Bridge &amp; service</b>'))
    assert.ok(rendered.text.includes('431028 14:15'))
    if (occurrence.post_role === 'primary') {
        assert.ok(rendered.text.includes('🔁 Ada Admin — 14:15'))
        assert.ok(!rendered.text.includes('✅'))
        assert.ok(rendered.text.endsWith('<footer>Pre-attendance</footer>'))
        assert.equal(rendered.replyMarkup?.inline_keyboard[0][0].callback_data, `sa:yes:${occurrence.id}`)
    } else {
        const actualTime = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(responses[0].checked_in_at!))
        assert.ok(rendered.text.includes(`✅ Ada Admin — ${actualTime}`))
        assert.ok(rendered.text.endsWith('<footer>Attendance</footer>'))
        assert.equal(rendered.replyMarkup?.inline_keyboard[0][0].callback_data, `sa:check:${occurrence.id}`)
    }
}
assert.ok(bridge.legacy.length >= 3)
for (const { source, body, timezone } of bridge.legacy) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(source.expires_at))
    function part(type: Intl.DateTimeFormatPartTypes): string { return parts.find(value => value.type === type)?.value ?? '' }
    const date = `${String(Number(part('year')) - 1983).padStart(2, '0')}${part('month')}${part('day')}`
    assert.equal(body, renderTemplate(source.body, { ...source.fields, date, time: `${part('hour')}:${part('minute')}` }))
}
process.stdout.write('SQL records -> production renderer: both attendance phases, actual workspace clock and legacy content parity passed.\n')
