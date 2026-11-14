import { describe, expect, test, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SegmentedControl } from '../../../../../../packages/ui/src/components/controls/segmented-control'

type ChangeDetails = { cancel: () => void }
type GroupProps = { onValueChange: (values: string[], details: ChangeDetails) => void }

describe('SegmentedControl selection', () => {
    test('cancels deselection in uncontrolled mode so Base UI preserves the active item', () => {
        const onValueChange = vi.fn()
        const group = SegmentedControl({
            defaultValue: 'list',
            onValueChange,
            'aria-label': 'View',
            children: <><SegmentedControl.Item value="list">List</SegmentedControl.Item><SegmentedControl.Item value="calendar">Calendar</SegmentedControl.Item></>,
        })
        const markup = renderToStaticMarkup(group)
        const details = { cancel: vi.fn() }
        const props = group.props as GroupProps
        props.onValueChange([], details)

        expect(markup).toContain('aria-pressed="true"')
        expect(details.cancel).toHaveBeenCalledOnce()
        expect(onValueChange).not.toHaveBeenCalled()
    })

    test('allows changing to another item and forwards the single value', () => {
        const onValueChange = vi.fn()
        const group = SegmentedControl({ value: 'list', onValueChange, children: <SegmentedControl.Item value="calendar">Calendar</SegmentedControl.Item> })
        const details = { cancel: vi.fn() }
        const props = group.props as GroupProps
        props.onValueChange(['calendar'], details)

        expect(details.cancel).not.toHaveBeenCalled()
        expect(onValueChange).toHaveBeenCalledExactlyOnceWith('calendar')
    })

    test('preserves Base UI disabled behavior for groups and individual items', () => {
        const disabledGroup = renderToStaticMarkup(<SegmentedControl defaultValue="list" disabled><SegmentedControl.Item value="list">List</SegmentedControl.Item></SegmentedControl>)
        const disabledItem = renderToStaticMarkup(<SegmentedControl defaultValue="list"><SegmentedControl.Item value="list">List</SegmentedControl.Item><SegmentedControl.Item value="calendar" disabled>Calendar</SegmentedControl.Item></SegmentedControl>)

        expect(disabledGroup).toMatch(/<button[^>]*disabled=""[^>]*>List<\/button>/)
        expect(disabledItem).toMatch(/<button[^>]*disabled=""[^>]*>Calendar<\/button>/)
    })
})
