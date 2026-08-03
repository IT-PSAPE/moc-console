import { CalendarClock } from "lucide-react"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields"

type ChecklistScheduleFieldProps = {
  value: string
  onChange: (value: string) => void
}

export function ChecklistScheduleField({ value, onChange }: ChecklistScheduleFieldProps) {
  return (
    <MetaRow icon={<CalendarClock />} label="Scheduled">
      <DateTimeFields ariaLabel="Checklist scheduled date" name="checklist-scheduled" value={value} onChange={onChange} required style="ghost" fieldLabels="hidden" />
    </MetaRow>
  )
}
