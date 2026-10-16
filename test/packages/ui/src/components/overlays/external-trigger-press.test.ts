import { describe, expect, test } from 'vitest'
import { isOpeningTriggerPress } from '../../../../../../packages/ui/src/components/overlays/external-trigger-press'

const trigger = {
    getBoundingClientRect: () => ({ left: 100, right: 180, top: 40, bottom: 84, width: 80, height: 44 }),
} as unknown as HTMLElement

function clickAt(clientX: number, clientY: number): Event {
    return Object.assign(new Event('click'), { clientX, clientY })
}

describe('external trigger opening press', () => {
    test('recognizes the release redirected to a newly opened backdrop', () => {
        expect(isOpeningTriggerPress(clickAt(140, 60), trigger, false)).toBe(true)
        expect(isOpeningTriggerPress(clickAt(200, 100), trigger, false)).toBe(false)
    })

    test('allows subsequent backdrop presses even over the original trigger', () => {
        expect(isOpeningTriggerPress(clickAt(140, 60), trigger, true)).toBe(false)
    })

    test('recognizes trigger descendants through the event path', () => {
        const event = Object.assign(new Event('click'), { composedPath: () => [trigger] })
        expect(isOpeningTriggerPress(event, trigger, false)).toBe(true)
    })

    test('does not suppress keyboard, pointerdown, or triggerless dismissal', () => {
        expect(isOpeningTriggerPress(new Event('keydown'), trigger, false)).toBe(false)
        expect(isOpeningTriggerPress(new Event('pointerdown'), trigger, false)).toBe(false)
        expect(isOpeningTriggerPress(clickAt(140, 60), null, false)).toBe(false)
    })
})
