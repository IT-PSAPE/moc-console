import { describe, expect, test } from 'bun:test'
import { getDateSlotPickerSlotClassName } from '../../../../../../packages/ui/src/components/form/date-slot-picker'

describe('DateSlotPicker.Slot', () => {
  test('adds the brand hover treatment only to available unselected slots', () => {
    const availableClassName = getDateSlotPickerSlotClassName(true, false)
    const selectedClassName = getDateSlotPickerSlotClassName(true, true)
    const unavailableClassName = getDateSlotPickerSlotClassName(false, false)

    expect(availableClassName).toContain('hover:border-brand/40')
    expect(availableClassName).toContain('hover:bg-brand_solid/10')
    expect(selectedClassName).not.toContain('hover:border-brand/40')
    expect(selectedClassName).not.toContain('hover:bg-brand_solid/10')
    expect(unavailableClassName).not.toContain('hover:border-brand/40')
    expect(unavailableClassName).not.toContain('hover:bg-brand_solid/10')
  })
})
