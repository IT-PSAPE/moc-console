import { Plus } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { Button } from '@/components/ui/button'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDate } from '@/lib/utils'
import type { CueEvent } from '@/types'
import type { Dispatch } from 'react'
import type { CueSheetAction } from './types'

const SEARCH_FIELDS: (keyof CueEvent)[] = ['name', 'description']

interface EventListProps {
  events: CueEvent[]
  activeEventId: string | null
  dispatch: Dispatch<CueSheetAction>
  onSelectEvent: (id: string) => void
  onNewEvent: () => void
}

export function EventList({ events, activeEventId, onSelectEvent, onNewEvent }: EventListProps) {
  const { search, setSearch, filtered } = useListFilter({
    data: events,
    searchFields: SEARCH_FIELDS,
  })

  function handleRowClick(row: CueEvent) {
    onSelectEvent(row.id)
  }

  function renderRow(row: CueEvent) {
    return (
      <>
        <DataTable.Cell className={`font-medium ${row.id === activeEventId ? 'text-text-brand' : 'text-text-primary'}`}>
          {row.name}
        </DataTable.Cell>
        <DataTable.Cell className="text-text-tertiary line-clamp-1">{row.description}</DataTable.Cell>
        <DataTable.Cell>{row.totalDurationMinutes}m</DataTable.Cell>
        <DataTable.Cell>{row.tracks.length}</DataTable.Cell>
        <DataTable.Cell>{row.cueItems.length}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDate(row.createdAt)}</DataTable.Cell>
      </>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Search events..." />
        </div>
        <Button variant="primary" size="sm" onClick={onNewEvent}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          New Event
        </Button>
      </div>
      <DataTable.Root data={filtered} onRowClick={handleRowClick}>
        <DataTable.Header>
          <DataTable.Column field="name" sortable>Event Name</DataTable.Column>
          <DataTable.Column field="description">Description</DataTable.Column>
          <DataTable.Column field="totalDurationMinutes" sortable>Duration</DataTable.Column>
          <DataTable.Column field="tracks">Tracks</DataTable.Column>
          <DataTable.Column field="cueItems">Cues</DataTable.Column>
          <DataTable.Column field="createdAt" sortable>Created</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<CueEvent> render={renderRow} />
      </DataTable.Root>
    </div>
  )
}
