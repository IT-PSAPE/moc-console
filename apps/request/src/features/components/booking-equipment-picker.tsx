import { Label } from '@moc/ui/components/display/text'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { FieldError } from '@/features/components/field-error'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { useBookingEquipmentPicker } from '../hooks/use-booking-equipment-picker'
import type { StepValidationErrors } from '@/features/hooks/use-step-validation'

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
  errors: StepValidationErrors
}

export function BookingEquipmentPicker({ selected, onToggle, otherEquipment, onOtherChange, errors }: BookingEquipmentPickerProps) {
  const picker = useBookingEquipmentPicker({ otherEquipment, onOtherChange, onToggle })

  function renderEquipment(label: typeof BOOKABLE_EQUIPMENT[number]) {
    return (
      <Checkbox
        key={label}
        id={label === BOOKABLE_EQUIPMENT[0] ? 'booking-equipment' : undefined}
        value={label}
        checked={selected.includes(label)}
        onChange={picker.actions.changeEquipment}
        aria-describedby={errors['booking-equipment'] ? 'booking-equipment-error' : undefined}
        className="w-full rounded-lg border border-secondary px-3 py-2.5"
      >
        <Label.sm>{label}</Label.sm>
      </Checkbox>
    )
  }

  return (
    <fieldset aria-invalid={Boolean(errors['booking-equipment']) || undefined} aria-describedby={errors['booking-equipment'] ? 'booking-equipment-error' : undefined} className="flex flex-col gap-4">
      <legend className="sr-only">Equipment</legend>
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
            aria-invalid={Boolean(errors['booking-equipment']) || undefined}
            aria-describedby={errors['booking-equipment'] ? 'booking-equipment-error' : undefined}
            placeholder="List anything else you need that isn't shown above…"
            value={otherEquipment}
            onChange={picker.actions.changeOther}
            rows={3}
          />
        </div>
      )}
      <FieldError id="booking-equipment-error" message={errors['booking-equipment']} />
    </fieldset>
  )
}
