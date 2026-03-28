import { useMemo } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { RecordCard } from '@/components/ui/record-card'
import { SearchInput } from '@/components/ui/search-input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs } from '@/components/ui/tabs'
import { useBookings, useIssues } from '@/hooks/use-equipment'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { EquipmentBooking, EquipmentIssue, FilterConfig } from '@/types'

const BOOKING_SEARCH_FIELDS: (keyof EquipmentBooking)[] = ['equipment_name', 'booked_by', 'assigned_to', 'event']
const ISSUE_SEARCH_FIELDS: (keyof EquipmentIssue)[] = ['equipment_name', 'description', 'reported_by']

function getFilterOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }))
}

function BookingHistory({ bookings }: { bookings: EquipmentBooking[] }) {
  const filters = useMemo<FilterConfig[]>(() => {
    const equipmentNames = Array.from(new Set(bookings.map((b) => b.equipment_name))).sort()
    const assignees = Array.from(new Set(bookings.map((b) => b.assigned_to))).sort()
    return [
      { key: 'equipment_name', label: 'Equipment', options: getFilterOptions(equipmentNames) },
      { key: 'assigned_to', label: 'Assigned To', options: getFilterOptions(assignees) },
    ]
  }, [bookings])

  const { activeFilters, clearFilters, filtered, handleFilterChange, search, setSearch } = useListFilter({
    data: bookings,
    searchFields: BOOKING_SEARCH_FIELDS,
  })

  function renderCard(booking: EquipmentBooking) {
    return (
      <RecordCard.Root>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{booking.equipment_name}</RecordCard.Title>
            <RecordCard.Subtitle>{booking.assigned_to}{booking.event ? ` — ${booking.event}` : ''}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={booking.status} />
        </RecordCard.Header>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Qty">{booking.quantity}</RecordCard.Field>
          <RecordCard.Field label="Booked By">{booking.booked_by}</RecordCard.Field>
          <RecordCard.Field label="Start">{formatDateTime(booking.start_date)}</RecordCard.Field>
          <RecordCard.Field label="End">{formatDateTime(booking.end_date)}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  function renderRow(booking: EquipmentBooking) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{booking.equipment_name}</DataTable.Cell>
        <DataTable.Cell>{booking.assigned_to}</DataTable.Cell>
        <DataTable.Cell>{booking.event ?? '—'}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={booking.status} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDateTime(booking.start_date)}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDateTime(booking.end_date)}</DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:min-w-72">
            <SearchInput onChange={setSearch} placeholder="Search past bookings..." value={search} />
          </div>
          <FilterDrawer activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onFilterChange={handleFilterChange} />
        </div>
        <FilterSummary activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      <DataTable.Root
        data={filtered}
        emptyMessage="No booking history matches the current filters."
        getRowKey={(b) => b.id}
        renderCard={renderCard}
      >
        <DataTable.Header>
          <DataTable.Column field="equipment_name" sortable>Equipment</DataTable.Column>
          <DataTable.Column field="assigned_to" sortable>Assigned To</DataTable.Column>
          <DataTable.Column field="event">Event</DataTable.Column>
          <DataTable.Column field="status" sortable>Status</DataTable.Column>
          <DataTable.Column field="start_date" sortable>Start</DataTable.Column>
          <DataTable.Column field="end_date" sortable>End</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<EquipmentBooking> render={renderRow} />
      </DataTable.Root>
    </>
  )
}

function IssueHistory({ issues }: { issues: EquipmentIssue[] }) {
  const filters = useMemo<FilterConfig[]>(() => {
    const equipmentNames = Array.from(new Set(issues.map((i) => i.equipment_name))).sort()
    return [
      { key: 'equipment_name', label: 'Equipment', options: getFilterOptions(equipmentNames) },
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Resolved', value: 'resolved' },
        ],
      },
    ]
  }, [issues])

  const { activeFilters, clearFilters, filtered, handleFilterChange, search, setSearch } = useListFilter({
    data: issues,
    searchFields: ISSUE_SEARCH_FIELDS,
  })

  function renderCard(issue: EquipmentIssue) {
    return (
      <RecordCard.Root>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{issue.equipment_name}</RecordCard.Title>
            <RecordCard.Subtitle>Reported by {issue.reported_by}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={issue.status} />
        </RecordCard.Header>
        <div className="mt-2 text-sm text-text-secondary">{issue.description}</div>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Logged">{formatDate(issue.created_at)}</RecordCard.Field>
          {issue.resolved_at && <RecordCard.Field label="Resolved">{formatDate(issue.resolved_at)}</RecordCard.Field>}
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  function renderRow(issue: EquipmentIssue) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{issue.equipment_name}</DataTable.Cell>
        <DataTable.Cell className="max-w-xs truncate">{issue.description}</DataTable.Cell>
        <DataTable.Cell>{issue.reported_by}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={issue.status} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDate(issue.created_at)}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{issue.resolved_at ? formatDate(issue.resolved_at) : '—'}</DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:min-w-72">
            <SearchInput onChange={setSearch} placeholder="Search issue history..." value={search} />
          </div>
          <FilterDrawer activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onFilterChange={handleFilterChange} />
        </div>
        <FilterSummary activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      <DataTable.Root
        data={filtered}
        emptyMessage="No issue history matches the current filters."
        getRowKey={(i) => i.id}
        renderCard={renderCard}
      >
        <DataTable.Header>
          <DataTable.Column field="equipment_name" sortable>Equipment</DataTable.Column>
          <DataTable.Column field="description">Description</DataTable.Column>
          <DataTable.Column field="reported_by" sortable>Reported By</DataTable.Column>
          <DataTable.Column field="status" sortable>Status</DataTable.Column>
          <DataTable.Column field="created_at" sortable>Date Logged</DataTable.Column>
          <DataTable.Column field="resolved_at" sortable>Resolved</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<EquipmentIssue> render={renderRow} />
      </DataTable.Root>
    </>
  )
}

export function EquipmentReports() {
  const { data: bookings = [] } = useBookings()
  const { data: issues = [] } = useIssues()

  // Reports shows all bookings (including returned) sorted most recent first
  const allBookings = useMemo(
    () => [...bookings].sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [bookings],
  )

  return (
    <Tabs.Root defaultTab="bookings">
      <Tabs.List>
        <Tabs.Trigger id="bookings">Booking History ({allBookings.length})</Tabs.Trigger>
        <Tabs.Trigger id="issues">Issue History ({issues.length})</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content id="bookings">
        <BookingHistory bookings={allBookings} />
      </Tabs.Content>
      <Tabs.Content id="issues">
        <IssueHistory issues={issues} />
      </Tabs.Content>
    </Tabs.Root>
  )
}
