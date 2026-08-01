import { Select } from "@moc/ui/components/form/select"
import { bookingStatusLabel } from "@moc/types/equipment"
import type { BookingStatus } from "@moc/types/equipment"

const statuses: BookingStatus[] = ["booked", "checked_out", "returned"]
const statusItems = statuses.map((status) => ({ label: bookingStatusLabel[status], value: status }))

type BookingStatusSelectProps = {
  status: BookingStatus
  onSelectStatus: (status: BookingStatus) => void
}

export function BookingStatusSelect({ status, onSelectStatus }: BookingStatusSelectProps) {
  function handleChange(value: BookingStatus | null) {
    if (value) onSelectStatus(value)
  }

  function renderStatus(option: BookingStatus) {
    return <Select.Item key={option} value={option}>{bookingStatusLabel[option]}</Select.Item>
  }

  return (
    <Select.Root name="booking-status" items={statusItems} value={status} onValueChange={handleChange}>
      <Select.Trigger aria-label="Booking status" className="w-44" style="ghost" />
      <Select.Content>{statuses.map(renderStatus)}</Select.Content>
    </Select.Root>
  )
}
