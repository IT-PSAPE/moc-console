import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { RecordCard } from '@/components/ui/record-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { DetailPanel } from '@/components/ui/detail-panel'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDateTime } from '@/lib/utils'
import { mockBroadcasts } from '@/lib/mock-broadcasts'
import type { Broadcast, FilterConfig } from '@/types'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Live', value: 'live' },
      { label: 'Scheduled', value: 'scheduled' },
      { label: 'Completed', value: 'completed' },
      { label: 'Draft', value: 'draft' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    key: 'channel',
    label: 'Channel',
    options: [
      { label: 'MOC Live', value: 'MOC Live' },
      { label: 'MOC Events', value: 'MOC Events' },
      { label: 'MOC Profiles', value: 'MOC Profiles' },
    ],
  },
]

const SEARCH_FIELDS: (keyof Broadcast)[] = ['title']

interface BroadcastListProps {
  statusFilter?: string
}

export function BroadcastList({ statusFilter }: BroadcastListProps) {
  const initialFilters: Record<string, string[]> = statusFilter ? { status: [statusFilter] } : {}
  const { search, setSearch, activeFilters, filtered, handleFilterChange, clearFilters } = useListFilter({
    data: mockBroadcasts,
    searchFields: SEARCH_FIELDS,
    initialFilters,
  })
  const [selected, setSelected] = useState<Broadcast | null>(null)

  function handleClosePanel() {
    setSelected(null)
  }

  function getScheduleCopy(row: Broadcast) {
    const date = row.scheduled_at ?? row.started_at
    return date ? formatDateTime(date) : 'Not scheduled'
  }

  function renderRow(row: Broadcast) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{row.title}</DataTable.Cell>
        <DataTable.Cell>{row.channel}</DataTable.Cell>
        <DataTable.Cell>
          <StatusBadge status={row.status} variant={row.status === 'live' ? 'dot' : 'default'} />
        </DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">
          {getScheduleCopy(row)}
        </DataTable.Cell>
        <DataTable.Cell>{row.duration_minutes ? `${row.duration_minutes}m` : '—'}</DataTable.Cell>
        <DataTable.Cell>{row.viewer_count?.toLocaleString() ?? '—'}</DataTable.Cell>
      </>
    )
  }

  function renderCard(row: Broadcast) {
    return (
      <RecordCard.Root onClick={() => setSelected(row)}>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{row.title}</RecordCard.Title>
            <RecordCard.Subtitle>{row.channel}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={row.status} variant={row.status === 'live' ? 'dot' : 'default'} />
        </RecordCard.Header>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Scheduled">{getScheduleCopy(row)}</RecordCard.Field>
          <RecordCard.Field label="Duration">{row.duration_minutes ? `${row.duration_minutes} minutes` : 'TBD'}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={setSearch} placeholder="Search broadcasts..." />
          </div>
          <FilterDrawer filters={FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} onClearAll={clearFilters} />
        </div>

        <FilterSummary filters={FILTERS} activeFilters={activeFilters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      <DataTable.Root
        data={filtered}
        emptyMessage="No broadcasts match the current filters."
        getRowKey={(row) => row.id}
        onRowClick={setSelected}
        renderCard={renderCard}
      >
        <DataTable.Header>
          <DataTable.Column field="title" sortable>Title</DataTable.Column>
          <DataTable.Column field="channel" sortable>Channel</DataTable.Column>
          <DataTable.Column field="status" sortable>Status</DataTable.Column>
          <DataTable.Column field="scheduled_at" sortable>Scheduled</DataTable.Column>
          <DataTable.Column field="duration_minutes" sortable>Duration</DataTable.Column>
          <DataTable.Column field="viewer_count" sortable>Viewers</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<Broadcast> render={renderRow} />
      </DataTable.Root>

      <DetailPanel.Root open={!!selected} onClose={handleClosePanel}>
        {selected && (
          <>
            <DetailPanel.Header>{selected.title}</DetailPanel.Header>
            <DetailPanel.Body>
              <DetailPanel.Section label="Status">
                <StatusBadge status={selected.status} variant={selected.status === 'live' ? 'dot' : 'default'} />
              </DetailPanel.Section>
              <DetailPanel.Section label="Details">
                <DetailPanel.Field label="Description">{selected.description}</DetailPanel.Field>
                <DetailPanel.Field label="Channel">{selected.channel}</DetailPanel.Field>
                <DetailPanel.Field label="Duration">
                  {selected.duration_minutes ? `${selected.duration_minutes} minutes` : 'TBD'}
                </DetailPanel.Field>
                {selected.viewer_count != null && (
                  <DetailPanel.Field label="Viewers">{selected.viewer_count.toLocaleString()}</DetailPanel.Field>
                )}
              </DetailPanel.Section>
              <DetailPanel.Section label="Timeline">
                {selected.scheduled_at && (
                  <DetailPanel.Field label="Scheduled">{formatDateTime(selected.scheduled_at)}</DetailPanel.Field>
                )}
                {selected.started_at && (
                  <DetailPanel.Field label="Started">{formatDateTime(selected.started_at)}</DetailPanel.Field>
                )}
                {selected.ended_at && (
                  <DetailPanel.Field label="Ended">{formatDateTime(selected.ended_at)}</DetailPanel.Field>
                )}
              </DetailPanel.Section>
            </DetailPanel.Body>
          </>
        )}
      </DetailPanel.Root>
    </>
  )
}
