import { useState } from 'react'
import { List, Columns2, CalendarDays } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { RecordCard } from '@/components/ui/record-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { RequestDetailPanel } from './request-detail-panel'
import { RequestsKanban } from './requests-kanban'
import { RequestsCalendar } from './requests-calendar'
import { useListFilter } from '@/hooks/use-list-filter'
import { useRequests } from '@/hooks/use-requests'
import { formatDate, formatLabel } from '@/lib/utils'
import { REQUEST_PRIORITY_OPTIONS, REQUEST_STATUS_OPTIONS, REQUEST_TYPE_OPTIONS } from './request-constants'
import type { CultureRequest, FilterConfig } from '@/types'

export type ViewMode = 'list' | 'kanban' | 'calendar'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    options: REQUEST_STATUS_OPTIONS,
  },
  {
    key: 'priority',
    label: 'Priority',
    options: REQUEST_PRIORITY_OPTIONS,
  },
  {
    key: 'type',
    label: 'Type',
    options: REQUEST_TYPE_OPTIONS,
  },
]

const SEARCH_FIELDS: (keyof CultureRequest)[] = ['title', 'who', 'what', 'requester_email']

interface RequestsListProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function RequestsList({ viewMode, onViewModeChange }: RequestsListProps) {
  const { data: requests = [] } = useRequests()
  const { search, setSearch, activeFilters, filtered, handleFilterChange, clearFilters } = useListFilter({
    data: requests,
    searchFields: SEARCH_FIELDS,
  })
  const [selected, setSelected] = useState<CultureRequest | null>(null)

  function handleClosePanel() {
    setSelected(null)
  }

  function handleSelectRequest(request: CultureRequest) {
    setSelected(request)
  }

  function handleViewChange(value: string) {
    onViewModeChange(value as ViewMode)
  }

  function getAssigneeCopy(row: CultureRequest) {
    const assigneeCount = row.assignees?.length ?? 0
    return assigneeCount === 0 ? 'Unassigned' : `${assigneeCount} assigned`
  }

  function renderRow(row: CultureRequest) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{row.title}</DataTable.Cell>
        <DataTable.Cell>{row.who}</DataTable.Cell>
        <DataTable.Cell>{formatLabel(row.type)}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.status} /></DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.priority} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{getAssigneeCopy(row)}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{row.due_date ? formatDate(row.due_date) : '—'}</DataTable.Cell>
      </>
    )
  }

  function renderCard(row: CultureRequest) {
    return (
      <RecordCard.Root onClick={() => handleSelectRequest(row)}>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{row.title}</RecordCard.Title>
            <RecordCard.Subtitle>{row.who}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={row.priority} />
        </RecordCard.Header>
        <RecordCard.Badges>
          <StatusBadge status={row.status} />
          <StatusBadge status={row.type} />
        </RecordCard.Badges>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Due">{row.due_date ? formatDate(row.due_date) : 'Not set'}</RecordCard.Field>
          <RecordCard.Field label="Assignees">{getAssigneeCopy(row)}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SegmentedControl.Root ariaLabel="Request views" onChange={handleViewChange} value={viewMode}>
            <SegmentedControl.Option icon={List} label="List" value="list" />
            <SegmentedControl.Option icon={Columns2} label="Kanban" value="kanban" />
            <SegmentedControl.Option icon={CalendarDays} label="Calendar" value="calendar" />
          </SegmentedControl.Root>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:min-w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search requests..." />
            </div>
            <FilterDrawer filters={FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} onClearAll={clearFilters} />
          </div>
        </div>

        <FilterSummary filters={FILTERS} activeFilters={activeFilters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      {viewMode === 'list' && (
        <>
          <DataTable.Root
            data={filtered}
            emptyMessage="No requests match the current filters."
            getRowKey={(row) => row.id}
            onRowClick={setSelected}
            renderCard={renderCard}
          >
            <DataTable.Header>
              <DataTable.Column field="title" sortable>Title</DataTable.Column>
              <DataTable.Column field="who" sortable>Requester</DataTable.Column>
              <DataTable.Column field="type">Type</DataTable.Column>
              <DataTable.Column field="status" sortable>Status</DataTable.Column>
              <DataTable.Column field="priority" sortable>Priority</DataTable.Column>
              <DataTable.Column field="assignees">Assignees</DataTable.Column>
              <DataTable.Column field="due_date" sortable>Due Date</DataTable.Column>
            </DataTable.Header>
            <DataTable.Body<CultureRequest> render={renderRow} />
          </DataTable.Root>
          <RequestDetailPanel selected={selected} onClose={handleClosePanel} />
        </>
      )}

      {viewMode === 'kanban' && <RequestsKanban requests={filtered} />}
      {viewMode === 'calendar' && <RequestsCalendar requests={filtered} />}
    </>
  )
}
