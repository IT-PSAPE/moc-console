import { describe, expect, test } from 'vitest'
import {
    currentRichTextDateTimeValue,
    filterRichTextDateTimeSlashCommands,
    isRichTextDateTimeValue,
    matchRichTextDateTimeSlashCommand,
} from '../../../../../../packages/ui/src/components/form/rich-text-editor/rich-text-date-time'

describe('rich text date and time chips', () => {
    test('accepts only real calendar dates and 24-hour time values', () => {
        expect(isRichTextDateTimeValue('date', '2024-02-29')).toBe(true)
        expect(isRichTextDateTimeValue('date', '2026-02-29')).toBe(false)
        expect(isRichTextDateTimeValue('date', '0000-01-01')).toBe(false)
        expect(isRichTextDateTimeValue('time', '00:00')).toBe(true)
        expect(isRichTextDateTimeValue('time', '23:59')).toBe(true)
        expect(isRichTextDateTimeValue('time', '24:00')).toBe(false)
        expect(isRichTextDateTimeValue('time', '9:30')).toBe(false)
    })

    test('initializes explicit values in the supplied workspace timezone', () => {
        const instant = new Date('2026-10-26T23:30:00.000Z')
        expect(currentRichTextDateTimeValue('date', instant, 'Africa/Johannesburg')).toBe('2026-10-27')
        expect(currentRichTextDateTimeValue('time', instant, 'Africa/Johannesburg')).toBe('01:30')
        expect(currentRichTextDateTimeValue('date', instant, 'America/Los_Angeles')).toBe('2026-10-26')
        expect(currentRichTextDateTimeValue('time', instant, 'America/Los_Angeles')).toBe('16:30')
    })

    test('matches slash commands only at a text boundary and filters by typed prefix', () => {
        expect(matchRichTextDateTimeSlashCommand('Reminder /da')).toEqual({ start: 9, query: 'da' })
        expect(matchRichTextDateTimeSlashCommand('/')).toEqual({ start: 0, query: '' })
        expect(matchRichTextDateTimeSlashCommand('word/date')).toBeNull()
        expect(filterRichTextDateTimeSlashCommands('d').map(command => command.kind)).toEqual(['date'])
        expect(filterRichTextDateTimeSlashCommands('TI').map(command => command.kind)).toEqual(['time'])
        expect(filterRichTextDateTimeSlashCommands('x')).toEqual([])
    })
})
