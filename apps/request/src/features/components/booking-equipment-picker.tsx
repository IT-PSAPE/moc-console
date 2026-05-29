import { Label, Paragraph } from '@moc/ui/components/display/text'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { cn } from '@moc/utils/cn'
import { Check } from 'lucide-react'
import { useState } from 'react'

// ────────────────────────────────────────────────────────────────────────
// TODO(equipment-inventory): STOPGAP — hardcoded bookable equipment.
// While the inventory backend is being rebuilt, the live equipment browser
// (useEquipmentBrowser + <EquipmentList />, both commented out in
// booking-screen.tsx) is disabled and replaced by this fixed list. The
// selections do NOT map to real equipment rows — they're folded into the
// booking's notes at submit time. Restore the live picker (and drop this
// file + the BOOKABLE_EQUIPMENT constant) once inventory is ready.
// ────────────────────────────────────────────────────────────────────────
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
  // "Other" is open whenever it's been toggled on, or there's already text
  // for it (so the field survives navigating away from this step and back).
  const [otherOpen, setOtherOpen] = useState(otherEquipment.trim().length > 0)

  function toggleOther() {
    const next = !otherOpen
    setOtherOpen(next)
    if (!next) onOtherChange('') // clear the text when collapsing
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <FormLabel label="Equipment" required />
        <Paragraph.xs className="text-tertiary">
          Select everything you need. Tap "Other" to add anything that isn't listed.
        </Paragraph.xs>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {BOOKABLE_EQUIPMENT.map((label) => (
          <PickerRow
            key={label}
            label={label}
            selected={selected.includes(label)}
            onClick={() => onToggle(label)}
          />
        ))}
        <PickerRow label={OTHER_LABEL} selected={otherOpen} onClick={toggleOther} />
      </div>

      {otherOpen && (
        <div className="flex flex-col gap-1.5">
          <FormLabel label="Other equipment" />
          <TextArea
            placeholder="List anything else you need that isn't shown above..."
            value={otherEquipment}
            onChange={(e) => onOtherChange(e.target.value)}
            rows={3}
          />
        </div>
      )}
    </div>
  )
}

function PickerRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center justify-between gap-2 rounded-lg border p-3 transition-all cursor-pointer hover:bg-secondary/60 active:scale-[0.98]',
        selected
          ? 'border-brand bg-brand/5 ring-2 ring-utility-brand-400/20'
          : 'border-secondary bg-primary',
      )}
    >
      <Label.sm>{label}</Label.sm>
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          selected ? 'border-brand bg-brand text-white' : 'border-secondary text-transparent',
        )}
      >
        <Check className="size-3.5" />
      </span>
    </div>
  )
}
