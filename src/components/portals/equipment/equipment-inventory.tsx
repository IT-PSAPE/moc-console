import { useMemo, useState, type MouseEvent } from 'react'
import { LayoutGrid, List, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { DetailPanel } from '@/components/ui/detail-panel'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { RecordCard } from '@/components/ui/record-card'
import { ResourceCard } from '@/components/ui/resource-card'
import { SearchInput } from '@/components/ui/search-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { StatusBadge } from '@/components/ui/status-badge'
import { useEquipment } from '@/hooks/use-equipment'
import { useListFilter } from '@/hooks/use-list-filter'
import type { Equipment, FilterConfig } from '@/types'

interface EquipmentInventoryProps {
  onBookEquipment: (equipment: Equipment) => void
  onEditEquipment: (equipment: Equipment) => void
  onReportIssue: (equipment: Equipment) => void
}

interface EquipmentGridCardProps {
  equipment: Equipment
  onBookEquipment: (equipment: Equipment) => void
  onEditEquipment: (equipment: Equipment) => void
  onSelect: (equipment: Equipment) => void
}

const SEARCH_FIELDS: (keyof Equipment)[] = ['name', 'serial_number', 'location']

function getFilterOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }))
}

function canBook(equipment: Equipment) {
  return equipment.quantity_available > 0 && equipment.status !== 'faulty'
}

function EquipmentGridCard({ equipment, onBookEquipment, onEditEquipment, onSelect }: EquipmentGridCardProps) {
  function handleSelect() {
    onSelect(equipment)
  }

  function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onEditEquipment(equipment)
  }

  function handleBookClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onBookEquipment(equipment)
  }

  return (
    <ResourceCard.Root onClick={handleSelect}>
      <ResourceCard.Image
        alt={equipment.name}
        fallback={<Package className="h-10 w-10 text-text-quaternary" />}
        src={equipment.image_url}
      />
      <ResourceCard.Body>
        <ResourceCard.Title>{equipment.name}</ResourceCard.Title>
        {equipment.description && <ResourceCard.Description>{equipment.description}</ResourceCard.Description>}
        <ResourceCard.Meta>
          <StatusBadge status={equipment.status} />
          <span>{equipment.quantity_available}/{equipment.quantity} available</span>
        </ResourceCard.Meta>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={handleEditClick} size="sm" variant="secondary">Edit</Button>
          <Button disabled={!canBook(equipment)} onClick={handleBookClick} size="sm">Book</Button>
        </div>
      </ResourceCard.Body>
    </ResourceCard.Root>
  )
}

export function EquipmentInventory({ onBookEquipment, onEditEquipment, onReportIssue }: EquipmentInventoryProps) {
  const { data: equipment = [] } = useEquipment()
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [viewMode, setViewMode] = useState('table')

  const filters = useMemo<FilterConfig[]>(() => {
    const categories = Array.from(new Set(equipment.map((item) => item.category))).sort()
    const locations = Array.from(new Set(equipment.map((item) => item.location))).sort()

    return [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Available', value: 'available' },
          { label: 'Booked', value: 'booked' },
          { label: 'In Use', value: 'in_use' },
          { label: 'Faulty', value: 'faulty' },
        ],
      },
      {
        key: 'category',
        label: 'Type',
        options: getFilterOptions(categories),
      },
      {
        key: 'location',
        label: 'Location',
        options: getFilterOptions(locations),
      },
    ]
  }, [equipment])

  const { activeFilters, clearFilters, filtered, handleFilterChange, search, setSearch } = useListFilter({
    data: equipment,
    searchFields: SEARCH_FIELDS,
  })

  function handleClosePanel() {
    setSelectedEquipment(null)
  }

  function handleSelectEquipment(equipmentItem: Equipment) {
    setSelectedEquipment(equipmentItem)
  }

  function renderCard(equipmentItem: Equipment) {
    return (
      <RecordCard.Root onClick={() => handleSelectEquipment(equipmentItem)}>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{equipmentItem.name}</RecordCard.Title>
            <RecordCard.Subtitle>{equipmentItem.serial_number}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={equipmentItem.status} />
        </RecordCard.Header>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Type">{equipmentItem.category}</RecordCard.Field>
          <RecordCard.Field label="Location">{equipmentItem.location}</RecordCard.Field>
          <RecordCard.Field label="Available">{equipmentItem.quantity_available}/{equipmentItem.quantity}</RecordCard.Field>
          <RecordCard.Field label="Condition">{equipmentItem.condition}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  function renderRow(equipmentItem: Equipment) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{equipmentItem.name}</DataTable.Cell>
        <DataTable.Cell>{equipmentItem.category}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={equipmentItem.status} /></DataTable.Cell>
        <DataTable.Cell>{equipmentItem.location}</DataTable.Cell>
        <DataTable.Cell>{equipmentItem.assigned_to ?? '—'}</DataTable.Cell>
        <DataTable.Cell>{equipmentItem.quantity_available}/{equipmentItem.quantity}</DataTable.Cell>
        <DataTable.Cell>
          <div className="flex items-center gap-2">
            <Button onClick={() => onEditEquipment(equipmentItem)} size="sm" variant="secondary">Edit</Button>
            <Button disabled={!canBook(equipmentItem)} onClick={() => onBookEquipment(equipmentItem)} size="sm">Book</Button>
          </div>
        </DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SegmentedControl.Root ariaLabel="Inventory views" onChange={setViewMode} value={viewMode}>
            <SegmentedControl.Option icon={List} label="List" value="table" />
            <SegmentedControl.Option icon={LayoutGrid} label="Grid" value="grid" />
          </SegmentedControl.Root>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:min-w-72">
              <SearchInput onChange={setSearch} placeholder="Search equipment..." value={search} />
            </div>
            <FilterDrawer activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onFilterChange={handleFilterChange} />
          </div>
        </div>

        <FilterSummary activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onRemove={handleFilterChange} />
      </div>

      {viewMode === 'table' && (
        <DataTable.Root
          data={filtered}
          emptyMessage="No equipment matches the current filters."
          getRowKey={(item) => item.id}
          onRowClick={handleSelectEquipment}
          renderCard={renderCard}
        >
          <DataTable.Header>
            <DataTable.Column field="name" sortable>Name</DataTable.Column>
            <DataTable.Column field="category" sortable>Type</DataTable.Column>
            <DataTable.Column field="status" sortable>Status</DataTable.Column>
            <DataTable.Column field="location">Location</DataTable.Column>
            <DataTable.Column field="assigned_to">Assignment</DataTable.Column>
            <DataTable.Column field="quantity_available" sortable>Available</DataTable.Column>
            <DataTable.Column field="actions">Actions</DataTable.Column>
          </DataTable.Header>
          <DataTable.Body<Equipment> render={renderRow} />
        </DataTable.Root>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-border-secondary bg-background-primary px-4 py-10 text-center text-sm text-text-tertiary">
              No equipment matches the current filters.
            </div>
          ) : (
            filtered.map((equipmentItem) => (
              <EquipmentGridCard
                equipment={equipmentItem}
                key={equipmentItem.id}
                onBookEquipment={onBookEquipment}
                onEditEquipment={onEditEquipment}
                onSelect={handleSelectEquipment}
              />
            ))
          )}
        </div>
      )}

      <DetailPanel.Root open={Boolean(selectedEquipment)} onClose={handleClosePanel}>
        {selectedEquipment && (
          <>
            <DetailPanel.Header>{selectedEquipment.name}</DetailPanel.Header>
            <DetailPanel.Body>
              <div className="space-y-6">
                <DetailPanel.Section label="Status">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedEquipment.status} />
                    <StatusBadge status={selectedEquipment.condition} />
                  </div>
                </DetailPanel.Section>

                <DetailPanel.Section label="Availability">
                  <DetailPanel.Field label="Total Quantity">{selectedEquipment.quantity}</DetailPanel.Field>
                  <DetailPanel.Field label="Available">{selectedEquipment.quantity_available}</DetailPanel.Field>
                  {selectedEquipment.assigned_to && (
                    <DetailPanel.Field label="Current Assignment">{selectedEquipment.assigned_to}</DetailPanel.Field>
                  )}
                </DetailPanel.Section>

                <DetailPanel.Section label="Details">
                  {selectedEquipment.description && <DetailPanel.Field label="Description">{selectedEquipment.description}</DetailPanel.Field>}
                  <DetailPanel.Field label="Serial Number">{selectedEquipment.serial_number}</DetailPanel.Field>
                  <DetailPanel.Field label="Type">{selectedEquipment.category}</DetailPanel.Field>
                  <DetailPanel.Field label="Location">{selectedEquipment.location}</DetailPanel.Field>
                  {selectedEquipment.last_maintenance && <DetailPanel.Field label="Last Maintenance">{selectedEquipment.last_maintenance}</DetailPanel.Field>}
                </DetailPanel.Section>
              </div>
            </DetailPanel.Body>
            <DetailPanel.Footer>
              <Button onClick={() => onReportIssue(selectedEquipment)} size="sm" variant="secondary">Report Issue</Button>
              <Button onClick={() => onEditEquipment(selectedEquipment)} size="sm" variant="secondary">Edit</Button>
              <Button disabled={!canBook(selectedEquipment)} onClick={() => onBookEquipment(selectedEquipment)} size="sm">
                Book
              </Button>
            </DetailPanel.Footer>
          </>
        )}
      </DetailPanel.Root>
    </>
  )
}
