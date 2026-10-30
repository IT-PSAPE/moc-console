import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createMockReactModule, HookRuntime } from '../../../../apps/broadcast/src/features/test-hook-runtime'
import type { CalendarEvent } from '../../../../../packages/ui/src/components/display/calendar-types'

vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
const { useCalendarRange } = await import('../../../../../packages/ui/src/hooks/use-calendar-range')
const viewport = { scrollTop: 0, clientHeight: 600, scrollHeight: 3152, querySelector: () => ({ offsetHeight: 80 }) }

function useRange({ date, events = [], request = 0, days = 7 }: { date: Date; events?: CalendarEvent[]; request?: number; days?: number }) {
    const result = useCalendarRange(date, events, days, request)
    result.meta.viewportRef.current = viewport as unknown as HTMLDivElement
    return result
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 29, 14, 30))
    vi.stubGlobal('window', { setInterval, clearInterval, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    viewport.scrollTop = 0
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

test('opens the current week at the time line and preserves a manual scroll on data and clock updates', () => {
    const runtime = new HookRuntime(useRange)
    runtime.render({ date: new Date(2026, 9, 29) })
    expect(viewport.scrollTop).toBeGreaterThan(1500)
    viewport.scrollTop = 250
    runtime.render({ date: new Date(2026, 9, 29), events: [{ date: new Date(2026, 9, 29, 16), label: 'New item' }] })
    expect(viewport.scrollTop).toBe(250)
    vi.advanceTimersByTime(60_000)
    runtime.rerender()
    expect(viewport.scrollTop).toBe(250)
    runtime.unmount()
})

test('a repeated Today request scrolls even when the displayed week and date have not changed', () => {
    const runtime = new HookRuntime(useRange)
    const date = new Date(2026, 9, 29)
    runtime.render({ date })
    const target = viewport.scrollTop
    viewport.scrollTop = 0
    runtime.render({ date, request: 1 })
    expect(viewport.scrollTop).toBe(target)
    viewport.scrollTop = 0
    runtime.render({ date, request: 2 })
    expect(viewport.scrollTop).toBe(target)
    runtime.unmount()
})

test('navigating back to the current week restores the time line without scrolling unrelated weeks', () => {
    const runtime = new HookRuntime(useRange)
    runtime.render({ date: new Date(2026, 9, 5) })
    expect(viewport.scrollTop).toBe(7 * 128)
    viewport.scrollTop = 300
    runtime.render({ date: new Date(2026, 9, 12) })
    expect(viewport.scrollTop).toBe(300)
    const result = runtime.render({ date: new Date(2026, 9, 29) })
    expect(result.state.hasToday).toBe(true)
    expect(viewport.scrollTop).toBeGreaterThan(1500)
    runtime.unmount()
})

test('day view scrolls only when its date is today and past-event states update as time passes', () => {
    const runtime = new HookRuntime(useRange)
    const event = { date: new Date(2026, 9, 29, 14), endDate: new Date(2026, 9, 29, 14, 31), label: 'Finishing soon' }
    const initial = runtime.render({ date: new Date(2026, 9, 29), days: 1, events: [event] })
    expect(initial.state.dates[0].timedEvents[0].isPast).toBe(false)
    expect(viewport.scrollTop).toBeGreaterThan(1500)
    viewport.scrollTop = 500
    vi.advanceTimersByTime(60_000)
    expect(runtime.rerender().state.dates[0].timedEvents[0].isPast).toBe(true)
    expect(viewport.scrollTop).toBe(500)
    const tomorrow = runtime.render({ date: new Date(2026, 9, 30), days: 1 })
    expect(tomorrow.state.hasToday).toBe(false)
    runtime.unmount()
})
