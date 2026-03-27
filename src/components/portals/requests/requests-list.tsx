import { useState } from 'react'
import { List, Columns2, CalendarDays } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { RequestDetailPanel } from './request-detail-panel'
import { RequestsKanban } from './requests-kanban'
import { RequestsCalendar } from './requests-calendar'
import { useListFilter } from '@/hooks/use-list-filter'
import { useRequests } from '@/hooks/use-requests'
import { formatDate } from '@/lib/utils'
import type { CultureRequest, FilterConfig } from '@/types'

export type ViewMode = 'list' | 'kanban' | 'calendar'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'All Statuses',
    options: [
      { label: 'Pending', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
      { label: 'In Review', value: 'in_review' },
      { label: 'Completed', value: 'completed' },
    ],
  },
  {
    key: 'priority',
    label: 'All Priorities',
    options: [
      { label: 'Urgent', value: 'urgent' },
      { label: 'High', value: 'high' },
      { label: 'Medium', value: 'medium' },
      { label: 'Low', value: 'low' },
    ],
  },
  {
    key: 'type',
    label: 'All Types',
    options: [
      { label: 'Event', value: 'event' },
      { label: 'Program', value: 'program' },
      { label: 'Venue', value: 'venue' },
      { label: 'Equipment', value: 'equipment' },
      { label: 'Media', value: 'media' },
      { label: 'Other', value: 'other' },
    ],
  },
]

const SEARCH_FIELDS: (keyof CultureRequest)[] = ['title', 'who']

const VIEW_OPTIONS: { id: ViewMode; icon: typeof List; label: string }[] = [
  { id: 'list', icon: List, label: 'List' },
  { id: 'kanban', icon: Columns2, label: 'Kanban' },
  { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
]

interface ViewToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border-primary bg-background-secondary p-0.5">
      {VIEW_OPTIONS.map(({ id, icon: Icon, label }) => {
        function handleClick() {
          onChange(id)
        }
        return (
          <button
            key={id}
            onClick={handleClick}
            title={label}
            aria-label={label}
            className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${mode === id
                ? 'bg-background-primary text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary'
              }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

interface RequestsListProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function RequestsList({ viewMode, onViewModeChange }: RequestsListProps) {
  const { data: requests = [] } = useRequests()
  const { search, setSearch, activeFilters, filtered, handleFilterChange } = useListFilter({
    data: requests,
    searchFields: SEARCH_FIELDS,
  })
  const [selected, setSelected] = useState<CultureRequest | null>(null)

  function handleClosePanel() {
    setSelected(null)
  }

  function renderRow(row: CultureRequest) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{row.title}</DataTable.Cell>
        <DataTable.Cell>{row.who}</DataTable.Cell>
        <DataTable.Cell>{row.type}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.status} /></DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.priority} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{row.due_date ? formatDate(row.due_date) : '—'}</DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <ViewToggle mode={viewMode} onChange={onViewModeChange} />
        <div className="flex items-center gap-3">
          <div className="w-full max-w-xs">
            <SearchInput value={search} onChange={setSearch} placeholder="Search requests..." />
          </div>
          <FilterDrawer filters={FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
        </div>
      </div>

      {viewMode === 'list' && (
        <>
          <DataTable.Root data={filtered} onRowClick={setSelected}>
            <DataTable.Header>
              <DataTable.Column field="title" sortable>Title</DataTable.Column>
              <DataTable.Column field="who" sortable>Requester</DataTable.Column>
              <DataTable.Column field="type">Type</DataTable.Column>
              <DataTable.Column field="status" sortable>Status</DataTable.Column>
              <DataTable.Column field="priority" sortable>Priority</DataTable.Column>
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
