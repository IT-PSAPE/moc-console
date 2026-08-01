import { Label } from '@moc/ui/components/display/text'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { useBookingEquipmentPicker } from '../hooks/use-booking-equipment-picker'

// These choices are submitted as requested equipment labels rather than
// inventory row IDs. Inventory allocation happens after the booking request.
export const BOOKABLE_EQUIPMENT = [
  'Wireless Microphone',
  'Speaker',
  'Mixer',
  'Extension cable wheel',
  'HDMI cable (5m)',
  'Camera',
  'Wired Microphone',
  'Multi-plug',
  'Projector',
] as const

const OTHER_LABEL = 'Other'

type BookingEquipmentPickerProps = {
  selected: string[]
  onToggle: (label: string) => void
  otherEquipment: string
  onOtherChange: (text: string) => void
}

export function BookingEquipmentPicker({ selected, onToggle, otherEquipment, onOtherChange }: BookingEquipmentPickerProps) {
  const picker = useBookingEquipmentPicker({ otherEquipment, onOtherChange, onToggle })

  function renderEquipment(label: typeof BOOKABLE_EQUIPMENT[number]) {
    return (
      <Checkbox
        key={label}
        value={label}
        checked={selected.includes(label)}
        onChange={picker.actions.changeEquipment}
        className="w-full rounded-lg border border-secondary px-3 py-2.5"
      >
        <Label.sm>{label}</Label.sm>
      </Checkbox>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <FormLabel label="Equipment" required />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {BOOKABLE_EQUIPMENT.map(renderEquipment)}
        <Checkbox checked={picker.state.isOtherOpen} onChange={picker.actions.toggleOther} className="w-full rounded-lg border border-secondary px-3 py-2.5">
          <Label.sm>{OTHER_LABEL}</Label.sm>
        </Checkbox>
      </div>

      {picker.state.isOtherOpen && (
        <div className="flex flex-col gap-1.5">
          <FormLabel label="Other equipment" />
          <TextArea
            aria-label="Other equipment"
            name="other-equipment"
            placeholder="List anything else you need that isn't shown above…"
            value={otherEquipment}
            onChange={picker.actions.changeOther}
            rows={3}
          />
        </div>
      )}
    </div>
  )
}
