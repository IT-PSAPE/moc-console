import { Badge } from "@moc/ui/components/display/badge";
import { DataTable } from "@moc/ui/components/display/data-table";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { useTableRowDrawer } from "@/hooks/use-drawer-item";
import type { Booking } from "@moc/types/equipment";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { BookingDrawer } from "./booking-drawer";

const columns = [
  { key: "equipmentName", header: "Equipment" },
  { key: "bookedBy", header: "Booked By" },
  {
    key: "status",
    header: "Status",
    render: (_: unknown, row: Booking) => (
      <Badge label={bookingStatusLabel[row.status]} color={bookingStatusColor[row.status]} />
    ),
  },
  {
    key: "checkedOutDate",
    header: "Checked Out",
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "expectedReturnAt",
    header: "Expected Return",
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "returnedDate",
    header: "Returned",
    render: (value: unknown) =>
      value ? formatUtcIsoInBrowserTimeZone(value as string) : <span className="text-quaternary">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    render: (value: unknown) => (value as string) || <span className="text-quaternary">—</span>,
  },
];

export function BookingTableView({ bookings }: { bookings: Booking[] }) {
  const { selected, setSelected, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } =
    useTableRowDrawer<Booking>();

  return (
    <>
      <DataTable
        data={bookings}
        columns={columns}
        emptyMessage="No bookings found"
        onRowClick={(row) => setSelected(row)}
        className="rounded-lg border border-secondary overflow-hidden"
      />
      <Drawer open={!!selected} onOpenChange={handleOpenChange}>
        {selected && (
          <BookingDrawer
            booking={selected}
            onBookingClose={handleClose}
            isDirtyRef={isDirtyRef}
            requestCloseRef={requestCloseRef}
          />
        )}
      </Drawer>
    </>
  );
}
