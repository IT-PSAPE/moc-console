import { describe, expect, test } from 'vitest'
import { getCalendarCurrentTimeScrollTop, isCalendarEventPast, prioritizeCalendarEvents } from '../../../../packages/utils/src/calendar-presentation'

function at(hour: number, minute = 0): Date { return new Date(2026, 9, 29, hour, minute) }

describe('calendar event priority', () => {
    test('keeps ongoing durations active until their end and treats elapsed point events as past', () => {
        expect(isCalendarEventPast({ date: at(10), endDate: at(14) }, at(12))).toBe(false)
        expect(isCalendarEventPast({ date: at(10), endDate: at(12) }, at(12))).toBe(true)
        expect(isCalendarEventPast({ date: at(10) }, at(12))).toBe(true)
        expect(isCalendarEventPast({ date: at(12) }, at(12))).toBe(false)
        expect(isCalendarEventPast({ date: at(14) }, at(12))).toBe(false)
    })

    test('keeps date-only work active throughout its day and handles exclusive multi-day ends', () => {
        const event = { date: at(0), allDay: true }
        expect(isCalendarEventPast(event, at(23, 59))).toBe(false)
        expect(isCalendarEventPast(event, new Date(2026, 9, 30))).toBe(true)
        const multiDay = { ...event, endDate: new Date(2026, 10, 1) }
        expect(isCalendarEventPast(multiDay, new Date(2026, 9, 31, 23, 59))).toBe(false)
        expect(isCalendarEventPast(multiDay, new Date(2026, 10, 1))).toBe(true)
    })

    test('falls back to the start for invalid or reversed ends without marking invalid dates past', () => {
        expect(isCalendarEventPast({ date: at(10), endDate: new Date(Number.NaN) }, at(12))).toBe(true)
        expect(isCalendarEventPast({ date: at(10), endDate: at(9) }, at(12))).toBe(true)
        expect(isCalendarEventPast({ date: new Date(Number.NaN) }, at(12))).toBe(false)
    })

    test('prioritizes active and upcoming items chronologically before past items without mutating input', () => {
        const events = [
            { id: 'past-later', date: at(10) },
            { id: 'upcoming-later', date: at(18) },
            { id: 'ongoing', date: at(11), endDate: at(13) },
            { id: 'past-earlier', date: at(9) },
            { id: 'upcoming-next', date: at(14) },
        ]
        const originalOrder = events.map(event => event.id)
        expect(prioritizeCalendarEvents(events, at(12)).map(event => event.id)).toEqual(['ongoing', 'upcoming-next', 'upcoming-later', 'past-earlier', 'past-later'])
        expect(events.map(event => event.id)).toEqual(originalOrder)
    })
})

test('positions the current-time line below the sticky header and clamps at the day boundaries', () => {
    const height = 600
    const header = 80
    const scrollHeight = 3072 + header
    const scrollTop = getCalendarCurrentTimeScrollTop(at(14, 30), height, header, scrollHeight)
    const lineInViewport = header + (14 * 60 + 30) * 128 / 60 - scrollTop
    expect(lineInViewport).toBeGreaterThan(header)
    expect(lineInViewport).toBeLessThan(height)
    expect(getCalendarCurrentTimeScrollTop(at(0), height, header, scrollHeight)).toBe(0)
    expect(getCalendarCurrentTimeScrollTop(at(23, 59), height, header, scrollHeight)).toBe(scrollHeight - height)
})
