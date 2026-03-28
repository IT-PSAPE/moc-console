import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { RecordCard } from '@/components/ui/record-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { RequestDetailPanel } from './request-detail-panel'
import { useListFilter } from '@/hooks/use-list-filter'
import { useRequests } from '@/hooks/use-requests'
import { formatDate, formatLabel } from '@/lib/utils'
import { REQUEST_TYPE_OPTIONS } from './request-constants'
import type { CultureRequest, FilterConfig } from '@/types'

const ARCHIVE_FILTERS: FilterConfig[] = [
  {
    key: 'type',
    label: 'Type',
    options: REQUEST_TYPE_OPTIONS,
  },
]

const SEARCH_FIELDS: (keyof CultureRequest)[] = ['title', 'who', 'what', 'requester_email']

export function RequestsArchive() {
  const { data: requests = [] } = useRequests()
  const archivedRequests = requests.filter((r) => r.archived)

  const { search, setSearch, activeFilters, filtered, handleFilterChange, clearFilters } = useListFilter({
    data: archivedRequests,
    searchFields: SEARCH_FIELDS,
  })
  const [selected, setSelected] = useState<CultureRequest | null>(null)

  function renderRow(row: CultureRequest) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{row.title}</DataTable.Cell>
        <DataTable.Cell>{row.who}</DataTable.Cell>
        <DataTable.Cell>{formatLabel(row.type)}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.status} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{row.due_date ? formatDate(row.due_date) : '—'}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDate(row.updated_at)}</DataTable.Cell>
      </>
    )
  }

  function renderCard(row: CultureRequest) {
    return (
      <RecordCard.Root onClick={() => setSelected(row)}>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{row.title}</RecordCard.Title>
            <RecordCard.Subtitle>{row.who}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={row.status} />
        </RecordCard.Header>
        <RecordCard.Badges>
          <StatusBadge status={row.type} />
        </RecordCard.Badges>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Due">{row.due_date ? formatDate(row.due_date) : 'Not set'}</RecordCard.Field>
          <RecordCard.Field label="Archived">{formatDate(row.updated_at)}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-tertiary">
            {filtered.length} archived {filtered.length === 1 ? 'request' : 'requests'}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:min-w-72">
              <SearchInput value={search} onChange={setSearch} placeholder="Search archived requests..." />
            </div>
            <FilterDrawer filters={ARCHIVE_FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} onClearAll={clearFilters} />
          </div>
        </div>

        <FilterSummary filters={ARCHIVE_FILTERS} activeFilters={activeFilters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      <DataTable.Root
        data={filtered}
        emptyMessage="No archived requests found."
        getRowKey={(row) => row.id}
        onRowClick={setSelected}
        renderCard={renderCard}
      >
        <DataTable.Header>
          <DataTable.Column field="title" sortable>Title</DataTable.Column>
          <DataTable.Column field="who" sortable>Requester</DataTable.Column>
          <DataTable.Column field="type">Type</DataTable.Column>
          <DataTable.Column field="status">Last Status</DataTable.Column>
          <DataTable.Column field="due_date" sortable>Due Date</DataTable.Column>
          <DataTable.Column field="updated_at" sortable>Archived On</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<CultureRequest> render={renderRow} />
      </DataTable.Root>

      <RequestDetailPanel selected={selected} onClose={() => setSelected(null)} />
    </>
  )
}
