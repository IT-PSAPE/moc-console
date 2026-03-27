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
  onCheckoutEquipment: (equipment: Equipment) => void
  onEditEquipment: (equipment: Equipment) => void
}

interface EquipmentActionButtonsProps {
  equipment: Equipment
  onCheckoutEquipment: (equipment: Equipment) => void
  onEditEquipment: (equipment: Equipment) => void
}

interface EquipmentGridCardProps extends EquipmentActionButtonsProps {
  onSelect: (equipment: Equipment) => void
}

const SEARCH_FIELDS: (keyof Equipment)[] = ['name', 'serial_number', 'location']

function getFilterOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }))
}

function canCheckoutEquipment(equipment: Equipment) {
  return equipment.quantity_available > 0 && equipment.status !== 'maintenance' && equipment.status !== 'retired'
}

function EquipmentActionButtons({ equipment, onCheckoutEquipment, onEditEquipment }: EquipmentActionButtonsProps) {
  const checkoutDisabled = !canCheckoutEquipment(equipment)

  function handleEditClick() {
    onEditEquipment(equipment)
  }

  function handleCheckoutClick() {
    onCheckoutEquipment(equipment)
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleEditClick} size="sm" variant="secondary">Edit</Button>
      <Button disabled={checkoutDisabled} onClick={handleCheckoutClick} size="sm">
        Check Out
      </Button>
    </div>
  )
}

function EquipmentGridCard({ equipment, onCheckoutEquipment, onEditEquipment, onSelect }: EquipmentGridCardProps) {
  function handleSelect() {
    onSelect(equipment)
  }

  function handleEditClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onEditEquipment(equipment)
  }

  function handleCheckoutClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onCheckoutEquipment(equipment)
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
          <span>{equipment.quantity_available}/{equipment.quantity} in storage</span>
        </ResourceCard.Meta>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={handleEditClick} size="sm" variant="secondary">Edit</Button>
          <Button disabled={!canCheckoutEquipment(equipment)} onClick={handleCheckoutClick} size="sm">Check Out</Button>
        </div>
      </ResourceCard.Body>
    </ResourceCard.Root>
  )
}

export function EquipmentInventory({ onCheckoutEquipment, onEditEquipment }: EquipmentInventoryProps) {
  const { data: equipment = [] } = useEquipment()
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [viewMode, setViewMode] = useState('table')

  const filters = useMemo<FilterConfig[]>(() => {
    const categories = Array.from(new Set(equipment.map((item) => item.category))).sort()
    const conditions = Array.from(new Set(equipment.map((item) => item.condition))).sort()

    return [
      {
        key: 'status',
        label: 'Status',
        options: [
          { label: 'Available', value: 'available' },
          { label: 'Assigned', value: 'assigned' },
          { label: 'Maintenance', value: 'maintenance' },
          { label: 'Retired', value: 'retired' },
        ],
      },
      {
        key: 'category',
        label: 'Category',
        options: getFilterOptions(categories),
      },
      {
        key: 'condition',
        label: 'Condition',
        options: getFilterOptions(conditions.map((value) => value.charAt(0).toUpperCase() + value.slice(1))).map((option) => ({
          ...option,
          value: option.value.toLowerCase(),
        })),
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

  function handleEditSelectedEquipment() {
    if (!selectedEquipment) {
      return
    }

    onEditEquipment(selectedEquipment)
  }

  function handleCheckoutSelectedEquipment() {
    if (!selectedEquipment) {
      return
    }

    onCheckoutEquipment(selectedEquipment)
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
          <RecordCard.Field label="Category">{equipmentItem.category}</RecordCard.Field>
          <RecordCard.Field label="Location">{equipmentItem.location}</RecordCard.Field>
          <RecordCard.Field label="In Storage">{equipmentItem.quantity_available}/{equipmentItem.quantity}</RecordCard.Field>
          <RecordCard.Field label="Condition">{equipmentItem.condition}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  function renderRow(equipmentItem: Equipment) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{equipmentItem.name}</DataTable.Cell>
        <DataTable.Cell className="font-mono text-xs">{equipmentItem.serial_number}</DataTable.Cell>
        <DataTable.Cell>{equipmentItem.category}</DataTable.Cell>
        <DataTable.Cell><StatusBadge status={equipmentItem.status} /></DataTable.Cell>
        <DataTable.Cell>{equipmentItem.quantity}</DataTable.Cell>
        <DataTable.Cell>{equipmentItem.quantity_available}</DataTable.Cell>
        <DataTable.Cell>{equipmentItem.location}</DataTable.Cell>
        <DataTable.Cell>
          <EquipmentActionButtons
            equipment={equipmentItem}
            onCheckoutEquipment={onCheckoutEquipment}
            onEditEquipment={onEditEquipment}
          />
        </DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SegmentedControl.Root ariaLabel="Equipment storage views" onChange={setViewMode} value={viewMode}>
            <SegmentedControl.Option icon={List} label="Table" value="table" />
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
            <DataTable.Column field="serial_number">Serial</DataTable.Column>
            <DataTable.Column field="category" sortable>Category</DataTable.Column>
            <DataTable.Column field="status" sortable>Status</DataTable.Column>
            <DataTable.Column field="quantity" sortable>Total</DataTable.Column>
            <DataTable.Column field="quantity_available" sortable>In Storage</DataTable.Column>
            <DataTable.Column field="location">Location</DataTable.Column>
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
                onCheckoutEquipment={onCheckoutEquipment}
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
                <DetailPanel.Section label="Inventory Status">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedEquipment.status} />
                    <StatusBadge status={selectedEquipment.condition} />
                  </div>
                </DetailPanel.Section>

                <DetailPanel.Section label="Quantities">
                  <DetailPanel.Field label="Total Quantity">{selectedEquipment.quantity}</DetailPanel.Field>
                  <DetailPanel.Field label="Remaining In Storage">{selectedEquipment.quantity_available}</DetailPanel.Field>
                  <DetailPanel.Field label="Checked Out">{selectedEquipment.quantity - selectedEquipment.quantity_available}</DetailPanel.Field>
                </DetailPanel.Section>

                <DetailPanel.Section label="Details">
                  {selectedEquipment.description && <DetailPanel.Field label="Description">{selectedEquipment.description}</DetailPanel.Field>}
                  <DetailPanel.Field label="Serial Number">{selectedEquipment.serial_number}</DetailPanel.Field>
                  <DetailPanel.Field label="Category">{selectedEquipment.category}</DetailPanel.Field>
                  <DetailPanel.Field label="Location">{selectedEquipment.location}</DetailPanel.Field>
                  {selectedEquipment.last_maintenance && <DetailPanel.Field label="Last Maintenance">{selectedEquipment.last_maintenance}</DetailPanel.Field>}
                </DetailPanel.Section>
              </div>
            </DetailPanel.Body>
            <DetailPanel.Footer>
              <Button onClick={handleEditSelectedEquipment} size="sm" variant="secondary">Edit</Button>
              <Button disabled={!canCheckoutEquipment(selectedEquipment)} onClick={handleCheckoutSelectedEquipment} size="sm">
                Check Out
              </Button>
            </DetailPanel.Footer>
          </>
        )}
      </DetailPanel.Root>
    </>
  )
}
