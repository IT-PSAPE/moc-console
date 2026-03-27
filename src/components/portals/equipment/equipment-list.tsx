import { useState } from 'react'
import { DataTable } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { DetailPanel } from '@/components/ui/detail-panel'
import { Button } from '@/components/ui/button'
import { useListFilter } from '@/hooks/use-list-filter'
import { mockEquipment } from '@/lib/mock-equipment'
import type { Equipment, FilterConfig } from '@/types'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'All Statuses',
    options: [
      { label: 'Available', value: 'available' },
      { label: 'Assigned', value: 'assigned' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Retired', value: 'retired' },
    ],
  },
  {
    key: 'category',
    label: 'All Categories',
    options: [
      { label: 'Audio', value: 'Audio' },
      { label: 'Lighting', value: 'Lighting' },
      { label: 'Visual', value: 'Visual' },
      { label: 'Video', value: 'Video' },
      { label: 'Staging', value: 'Staging' },
    ],
  },
]

const SEARCH_FIELDS: (keyof Equipment)[] = ['name', 'serial_number']

interface EquipmentListProps {
  statusFilter?: string
}

export function EquipmentList({ statusFilter }: EquipmentListProps) {
  const initialFilters: Record<string, string> = statusFilter ? { status: statusFilter } : {}
  const { search, setSearch, activeFilters, filtered, handleFilterChange } = useListFilter({
    data: mockEquipment,
    searchFields: SEARCH_FIELDS,
    initialFilters,
  })
  const [selected, setSelected] = useState<Equipment | null>(null)

  function handleClosePanel() {
    setSelected(null)
  }

  function renderRow(row: Equipment) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{row.name}</DataTable.Cell>
        <DataTable.Cell className="font-mono text-xs">{row.serial_number}</DataTable.Cell>
        <DataTable.Cell>{row.category}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.status} /></DataTable.Cell>
        <DataTable.Cell><StatusBadge status={row.condition} /></DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{row.location}</DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Search equipment..." />
        </div>
        <FilterDrawer filters={FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} />
      </div>

      <DataTable.Root data={filtered} onRowClick={setSelected}>
        <DataTable.Header>
          <DataTable.Column field="name" sortable>Name</DataTable.Column>
          <DataTable.Column field="serial_number">Serial</DataTable.Column>
          <DataTable.Column field="category" sortable>Category</DataTable.Column>
          <DataTable.Column field="status" sortable>Status</DataTable.Column>
          <DataTable.Column field="condition" sortable>Condition</DataTable.Column>
          <DataTable.Column field="location">Location</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<Equipment> render={renderRow} />
      </DataTable.Root>

      <DetailPanel.Root open={!!selected} onClose={handleClosePanel}>
        {selected && (
          <>
            <DetailPanel.Header actions={<Button variant="secondary" size="sm">Edit</Button>}>
              {selected.name}
            </DetailPanel.Header>
            <DetailPanel.Body>
              <DetailPanel.Section label="Status">
                <div className="flex items-center gap-3">
                  <StatusBadge status={selected.status} />
                  <StatusBadge status={selected.condition} />
                </div>
              </DetailPanel.Section>
              <DetailPanel.Section label="Details">
                <DetailPanel.Field label="Serial Number">{selected.serial_number}</DetailPanel.Field>
                <DetailPanel.Field label="Category">{selected.category}</DetailPanel.Field>
                <DetailPanel.Field label="Location">{selected.location}</DetailPanel.Field>
                {selected.assigned_to && (
                  <DetailPanel.Field label="Assigned To">{selected.assigned_to}</DetailPanel.Field>
                )}
                {selected.last_maintenance && (
                  <DetailPanel.Field label="Last Maintenance">{selected.last_maintenance}</DetailPanel.Field>
                )}
              </DetailPanel.Section>
            </DetailPanel.Body>
            <DetailPanel.Footer>
              <Button variant="danger" size="sm">Retire</Button>
              <Button variant="primary" size="sm">Update Status</Button>
            </DetailPanel.Footer>
          </>
        )}
      </DetailPanel.Root>
    </>
  )
}
