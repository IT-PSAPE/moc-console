import { Badge } from "@moc/ui/components/display/badge";
import { DataTable } from "@moc/ui/components/display/data-table";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { useTableRowDrawer } from "@/hooks/use-drawer-item";
import type { Booking } from "@moc/types/equipment";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { BookingDrawer } from "./booking-drawer";

const columns = [
  { key: "title", header: "Title", width: 240 },
  {
    key: "items",
    header: "Items",
    width: 80,
    render: (_: unknown, row: Booking) => (
      <span className="tabular-nums">{row.items.length}</span>
    ),
  },
  { key: "bookedBy", header: "Booked By", width: 180 },
  {
    key: "status",
    header: "Status",
    width: 140,
    render: (_: unknown, row: Booking) => (
      <Badge label={bookingStatusLabel[row.status]} color={bookingStatusColor[row.status]} />
    ),
  },
  {
    key: "checkedOutDate",
    header: "Checked Out",
    width: 190,
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "expectedReturnAt",
    header: "Expected Return",
    width: 190,
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "returnedDate",
    header: "Returned",
    width: 190,
    render: (value: unknown) =>
      value ? formatUtcIsoInBrowserTimeZone(value as string) : <span className="text-quaternary">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    width: 260,
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
        minWidth={1470}
        emptyMessage="No bookings found"
        onRowClick={(row) => setSelected(row)}
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
