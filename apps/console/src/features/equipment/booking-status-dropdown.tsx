import { Badge } from "@moc/ui/components/display/badge";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { bookingStatusColor, bookingStatusLabel } from "@moc/types/equipment";
import type { BookingStatus } from "@moc/types/equipment";
import { Check } from "lucide-react";

const allStatuses: BookingStatus[] = ["booked", "checked_out", "returned"];

type BookingStatusDropdownProps = {
  status: BookingStatus;
  onSelectStatus: (status: BookingStatus) => void;
};

export function BookingStatusDropdown({ status, onSelectStatus }: BookingStatusDropdownProps) {
  return (
    <Dropdown placement="bottom">
      <Dropdown.Trigger>
        <Badge
          label={bookingStatusLabel[status]}
          color={bookingStatusColor[status]}
          className="cursor-pointer"
        />
      </Dropdown.Trigger>
      <Dropdown.Panel>
        {allStatuses.map((option) => (
          <BookingStatusOption
            key={option}
            status={option}
            selected={option === status}
            onSelectStatus={onSelectStatus}
          />
        ))}
      </Dropdown.Panel>
    </Dropdown>
  );
}

type BookingStatusOptionProps = {
  status: BookingStatus;
  selected: boolean;
  onSelectStatus: (status: BookingStatus) => void;
};

function BookingStatusOption({ status, selected, onSelectStatus }: BookingStatusOptionProps) {
  function handleSelect() {
    onSelectStatus(status);
  }

  return (
    <Dropdown.Item onSelect={handleSelect}>
      <span className="size-4 shrink-0 flex items-center justify-center">
        {selected ? <Check className="size-3.5 text-brand_secondary" /> : null}
      </span>
      {bookingStatusLabel[status]}
    </Dropdown.Item>
  );
}
