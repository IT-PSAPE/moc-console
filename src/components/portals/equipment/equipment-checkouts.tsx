import { useMemo, useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { RecordCard } from '@/components/ui/record-card'
import { SearchInput } from '@/components/ui/search-input'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useEquipmentCheckouts, useReturnEquipmentCheckout } from '@/hooks/use-equipment'
import { useListFilter } from '@/hooks/use-list-filter'
import { formatDateTime } from '@/lib/utils'
import type { EquipmentCheckout, FilterConfig } from '@/types'

const SEARCH_FIELDS: (keyof EquipmentCheckout)[] = ['equipment_name', 'checked_out_by', 'destination']

function getFilterOptions(values: string[]) {
  return values.map((value) => ({ label: value, value }))
}

function EquipmentCheckoutActions({ checkout, onReturn }: { checkout: EquipmentCheckout; onReturn: (checkoutId: string) => void }) {
  function handleReturnClick() {
    onReturn(checkout.id)
  }

  return (
    <Button onClick={handleReturnClick} size="sm" variant="secondary">Return</Button>
  )
}

export function EquipmentCheckouts() {
  const { data: checkouts = [] } = useEquipmentCheckouts()
  const { mutate: returnEquipmentCheckout } = useReturnEquipmentCheckout()
  const [viewMode, setViewMode] = useState('table')

  const activeCheckouts = useMemo(
    () => checkouts.filter((checkout) => !checkout.returned_at),
    [checkouts],
  )

  const filters = useMemo<FilterConfig[]>(() => {
    const collectors = Array.from(new Set(activeCheckouts.map((checkout) => checkout.checked_out_by))).sort()
    const destinations = Array.from(new Set(activeCheckouts.map((checkout) => checkout.destination))).sort()

    return [
      {
        key: 'checked_out_by',
        label: 'Collected By',
        options: getFilterOptions(collectors),
      },
      {
        key: 'destination',
        label: 'Destination',
        options: getFilterOptions(destinations),
      },
    ]
  }, [activeCheckouts])

  const { activeFilters, clearFilters, filtered, handleFilterChange, search, setSearch } = useListFilter({
    data: activeCheckouts,
    searchFields: SEARCH_FIELDS,
  })

  function handleReturn(checkoutId: string) {
    returnEquipmentCheckout(checkoutId)
  }

  function renderCard(checkout: EquipmentCheckout) {
    return (
      <RecordCard.Root>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{checkout.equipment_name}</RecordCard.Title>
            <RecordCard.Subtitle>{checkout.checked_out_by}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <span className="rounded-md border border-border-secondary bg-background-secondary px-2 py-1 text-xs text-text-secondary">
            {checkout.quantity} out
          </span>
        </RecordCard.Header>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Destination">{checkout.destination}</RecordCard.Field>
          <RecordCard.Field label="Collected">{formatDateTime(checkout.checked_out_at)}</RecordCard.Field>
        </RecordCard.FieldGrid>
        <div className="mt-4">
          <EquipmentCheckoutActions checkout={checkout} onReturn={handleReturn} />
        </div>
      </RecordCard.Root>
    )
  }

  function renderRow(checkout: EquipmentCheckout) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{checkout.equipment_name}</DataTable.Cell>
        <DataTable.Cell>{checkout.quantity}</DataTable.Cell>
        <DataTable.Cell>{checkout.checked_out_by}</DataTable.Cell>
        <DataTable.Cell>{checkout.destination}</DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{formatDateTime(checkout.checked_out_at)}</DataTable.Cell>
        <DataTable.Cell>
          <EquipmentCheckoutActions checkout={checkout} onReturn={handleReturn} />
        </DataTable.Cell>
      </>
    )
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SegmentedControl.Root ariaLabel="Equipment checkout views" onChange={setViewMode} value={viewMode}>
            <SegmentedControl.Option icon={List} label="Table" value="table" />
            <SegmentedControl.Option icon={LayoutGrid} label="Cards" value="grid" />
          </SegmentedControl.Root>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:min-w-72">
              <SearchInput onChange={setSearch} placeholder="Search checked out equipment..." value={search} />
            </div>
            <FilterDrawer activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onFilterChange={handleFilterChange} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterSummary activeFilters={activeFilters} filters={filters} onClearAll={clearFilters} onRemove={handleFilterChange} />
          <p className="text-sm text-text-tertiary">{filtered.length} active checkout{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {viewMode === 'table' && (
        <DataTable.Root
          data={filtered}
          emptyMessage="No checkouts match the current filters."
          getRowKey={(checkout) => checkout.id}
          renderCard={renderCard}
        >
          <DataTable.Header>
            <DataTable.Column field="equipment_name" sortable>Equipment</DataTable.Column>
            <DataTable.Column field="quantity" sortable>Qty</DataTable.Column>
            <DataTable.Column field="checked_out_by" sortable>Collected By</DataTable.Column>
            <DataTable.Column field="destination" sortable>Destination</DataTable.Column>
            <DataTable.Column field="checked_out_at" sortable>Date / Time</DataTable.Column>
            <DataTable.Column field="actions">Actions</DataTable.Column>
          </DataTable.Header>
          <DataTable.Body<EquipmentCheckout> render={renderRow} />
        </DataTable.Root>
      )}

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-border-secondary bg-background-primary px-4 py-10 text-center text-sm text-text-tertiary">
              No checkouts match the current filters.
            </div>
          ) : (
            filtered.map((checkout) => (
              <div key={checkout.id}>
                {renderCard(checkout)}
              </div>
            ))
          )}
        </div>
      )}
    </>
  )
}
