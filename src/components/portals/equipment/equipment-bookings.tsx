import { useMemo, useState } from 'react'
import { List, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { RecordCard } from '@/components/ui/record-card'
import { SearchInput } from '@/components/ui/search-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { useBookings, useUpdateBookingStatus } from '@/hooks/use-equipment'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDateTime } from '@/lib/utils'
import type { EquipmentBooking, FilterConfig } from '@/types'

interface EquipmentBookingsProps {
  onNewBooking: () => void
}

function isOverdue(booking: EquipmentBooking): boolean {
  return booking.status === 'in_use' && new Date(booking.end_date) < new Date()
}

const SEARCH_FIELDS: (keyof EquipmentBooking)[] = ['equipment_name', 'booked_by', 'assigned_to', 'event']

function getFilterOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }))
}

function BookingActions({ booking, onUpdateStatus }: { booking: EquipmentBooking; onUpdateStatus: (id: string, status: EquipmentBooking['status']) => void }) {
  if (booking.status === 'returned') return null

  if (booking.status === 'booked') {
    return (
      <div className="flex items-center gap-2">
        <Button onClick={() => onUpdateStatus(booking.id, 'in_use')} size="sm">
          Mark In Use
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => onUpdateStatus(booking.id, 'returned')} size="sm" variant="secondary">
      Mark Returned
    </Button>
  )
}

function BookingsList({ bookings, onUpdateStatus }: { bookings: EquipmentBooking[]; onUpdateStatus: (id: string, status: EquipmentBooking['status']) => void }) {
  const [viewMode, setViewMode] = useState('table')

  const filters = useMemo<FilterConfig[]>(() => {
    const assignees = Array.from(new Set(bookings.map((b) => b.assigned_to))).sort()
    return [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Booked', value: 'booked' },
          { label: 'In Use', value: 'in_use' },
          { label: 'Returned', value: 'returned' },
        ],
      },
      {
        key: 'assigned_to',
        label: 'Assigned To',
        options: getFilterOptions(assignees),
      },
    ]
  }, [bookings])

  const { activeFilters, clearFilters, filtered, handleFilterChange, search, setSearch } = useListFilter({
    data: bookings,
    searchFields: SEARCH_FIELDS,
  })

  function renderCard(booking: EquipmentBooking) {
    const overdue = isOverdue(booking)
    return (
      <RecordCard.Root>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>
              {overdue && (
                <span className="mr-2 rounded bg-utility-error-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-utility-error-700">
                  Overdue
                </span>
              )}
              {booking.equipment_name}
            </RecordCard.Title>
            <RecordCard.Subtitle>{booking.assigned_to}{booking.event ? ` — ${booking.event}` : ''}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={overdue ? 'overdue' : booking.status} />
        </RecordCard.Header>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Qty">{booking.quantity}</RecordCard.Field>
          <RecordCard.Field label="Booked By">{booking.booked_by}</RecordCard.Field>
          <RecordCard.Field label="Start">{formatDateTime(booking.start_date)}</RecordCard.Field>
          <RecordCard.Field label="End">{formatDateTime(booking.end_date)}</RecordCard.Field>
        </RecordCard.FieldGrid>
        <div className="mt-4">
          <BookingActions booking={booking} onUpdateStatus={onUpdateStatus} />
        </div>
      </RecordCard.Root>
    )
  }

  function renderRow(booking: EquipmentBooking) {
    const overdue = isOverdue(booking)
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">
          <div className="flex items-center gap-2">
            {overdue && (
              <span className="shrink-0 rounded bg-utility-error-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-utility-error-700">
                Overdue
              </span>
            )}
            {booking.equipment_name}
          </div>
        </DataTable.Cell>
        <DataTable.Cell>{booking.quantity}</DataTable.Cell>
        <DataTable.Cell>{booking.assigned_to}</DataTable.Cell>
        <DataTable.Cell>{booking.event ?? '—'}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={overdue ? 'overdue' : booking.status} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDateTime(booking.start_date)}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDateTime(booking.end_date)}</DataTable.Cell>
        <DataTable.Cell>
          <BookingActions booking={booking} onUpdateStatus={onUpdateStatus} />
        </DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SegmentedControl.Root ariaLabel="Booking views" onChange={setViewMode} value={viewMode}>
            <SegmentedControl.Option icon={List} label="Table" value="table" />
            <SegmentedControl.Option icon={CalendarDays} label="Cards" value="cards" />
          </SegmentedControl.Root>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:min-w-72">
              <SearchInput onChange={setSearch} placeholder="Search bookings..." value={search} />
            </div>
            <FilterDrawer activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onFilterChange={handleFilterChange} />
          </div>
        </div>
        <FilterSummary activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      {viewMode === 'table' && (
        <DataTable.Root
          data={filtered}
          emptyMessage="No bookings match the current filters."
          getRowKey={(b) => b.id}
          renderCard={renderCard}
        >
          <DataTable.Header>
            <DataTable.Column field="equipment_name" sortable>Equipment</DataTable.Column>
            <DataTable.Column field="quantity">Qty</DataTable.Column>
            <DataTable.Column field="assigned_to" sortable>Assigned To</DataTable.Column>
            <DataTable.Column field="event">Event</DataTable.Column>
            <DataTable.Column field="status" sortable>Status</DataTable.Column>
            <DataTable.Column field="start_date" sortable>Start</DataTable.Column>
            <DataTable.Column field="end_date" sortable>End</DataTable.Column>
            <DataTable.Column field="actions">Actions</DataTable.Column>
          </DataTable.Header>
          <DataTable.Body<EquipmentBooking> render={renderRow} />
        </DataTable.Root>
      )}

      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-border-secondary bg-background-primary px-4 py-10 text-center text-sm text-text-tertiary">
              No bookings match the current filters.
            </div>
          ) : (
            filtered.map((booking) => (
              <div key={booking.id}>
                {renderCard(booking)}
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}

export function EquipmentBookings({ onNewBooking }: EquipmentBookingsProps) {
  const { data: bookings = [] } = useBookings()
  const { mutate: updateBookingStatus } = useUpdateBookingStatus()

  function handleUpdateStatus(id: string, status: EquipmentBooking['status']) {
    updateBookingStatus({ id, status })
  }

  const overdueBookings = bookings.filter((b) => isOverdue(b))
  const activeBookings = bookings.filter((b) => b.status !== 'returned')
  const upcomingBookings = bookings.filter((b) => b.status === 'booked')
  const inUseBookings = bookings.filter((b) => b.status === 'in_use' && !isOverdue(b))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-text-tertiary">
          <span>{activeBookings.length} active</span>
          {overdueBookings.length > 0 && (
            <span className="font-medium text-utility-error-700">{overdueBookings.length} overdue</span>
          )}
        </div>
        <Button onClick={onNewBooking} size="sm" variant="primary">New Booking</Button>
      </div>

      <Tabs.Root defaultTab="all">
        <Tabs.List>
          <Tabs.Trigger id="all">All Active ({activeBookings.length})</Tabs.Trigger>
          <Tabs.Trigger id="upcoming">Upcoming ({upcomingBookings.length})</Tabs.Trigger>
          <Tabs.Trigger id="in-use">In Use ({inUseBookings.length})</Tabs.Trigger>
          {overdueBookings.length > 0 && (
            <Tabs.Trigger id="overdue">Overdue ({overdueBookings.length})</Tabs.Trigger>
          )}
        </Tabs.List>
        <Tabs.Content id="all">
          <BookingsList bookings={activeBookings} onUpdateStatus={handleUpdateStatus} />
        </Tabs.Content>
        <Tabs.Content id="upcoming">
          <BookingsList bookings={upcomingBookings} onUpdateStatus={handleUpdateStatus} />
        </Tabs.Content>
        <Tabs.Content id="in-use">
          <BookingsList bookings={inUseBookings} onUpdateStatus={handleUpdateStatus} />
        </Tabs.Content>
        {overdueBookings.length > 0 && (
          <Tabs.Content id="overdue">
            <BookingsList bookings={overdueBookings} onUpdateStatus={handleUpdateStatus} />
          </Tabs.Content>
        )}
      </Tabs.Root>
    </div>
  )
}
