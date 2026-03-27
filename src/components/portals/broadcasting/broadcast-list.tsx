import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { DetailPanel } from '@/components/ui/detail-panel'
import { Button } from '@/components/ui/button'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDateTime } from '@/lib/utils'
import { mockBroadcasts } from '@/lib/mock-broadcasts'
import type { Broadcast, FilterConfig } from '@/types'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'All Statuses',
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
    label: 'All Channels',
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
  const initialFilters: Record<string, string> = statusFilter ? { status: statusFilter } : {}
  const { search, setSearch, activeFilters, filtered, handleFilterChange } = useListFilter({
    data: mockBroadcasts,
    searchFields: SEARCH_FIELDS,
    initialFilters,
  })
  const [selected, setSelected] = useState<Broadcast | null>(null)

  function handleClosePanel() {
    setSelected(null)
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
          {formatDateTime(row.scheduled_at ?? row.started_at)}
        </DataTable.Cell>
        <DataTable.Cell>{row.duration_minutes ? `${row.duration_minutes}m` : '—'}</DataTable.Cell>
        <DataTable.Cell>{row.viewer_count?.toLocaleString() ?? '—'}</DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Search broadcasts..." />
        </div>
        <FilterDrawer filters={FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
      </div>

      <DataTable.Root data={filtered} onRowClick={setSelected}>
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
            <DetailPanel.Header actions={<Button variant="secondary" size="sm">Edit</Button>}>
              {selected.title}
            </DetailPanel.Header>
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
            <DetailPanel.Footer>
              {selected.status === 'draft' && <Button variant="primary" size="sm">Schedule</Button>}
              {selected.status === 'scheduled' && <Button variant="danger" size="sm">Cancel</Button>}
              {selected.status === 'live' && <Button variant="danger" size="sm">End Broadcast</Button>}
            </DetailPanel.Footer>
          </>
        )}
      </DetailPanel.Root>
    </>
  )
}
