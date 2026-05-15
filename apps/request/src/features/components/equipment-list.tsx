import { Input } from '@moc/ui/components/form/input'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Badge } from '@moc/ui/components/display/badge'
import { Decision } from '@moc/ui/components/display/decision'
import { Divider } from '@moc/ui/components/display/divider'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { Search, PackageOpen, SlidersHorizontal, X } from 'lucide-react'
import { EquipmentCard } from './equipment-card'
import { EQUIPMENT_CATEGORY_LABELS, EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUSES } from '../constants'
import type { EquipmentCategory, EquipmentStatus } from '@/types/equipment'
import { useState } from 'react'
import type { BookingFormState } from '../hooks/use-booking-form';
import type { useEquipmentBrowser } from '../hooks/use-equipment-browser';
import { Alert } from '@moc/ui/components/feedback/alert';

type EquipmentListProps = {
  state: BookingFormState
  equipment: ReturnType<typeof useEquipmentBrowser>
  onToggle: (id: string) => void
}

export function EquipmentList({ state, equipment, onToggle }: EquipmentListProps) {
  const [statusFilters, setStatusFilters] = useState<EquipmentStatus[]>([])

  const hasActiveFilters = equipment.categoryFilters.length > 0 || statusFilters.length > 0
  const activeFilterCount = equipment.categoryFilters.length + statusFilters.length

  const filteredItems = equipment.items.filter((item) => {
    if (statusFilters.length > 0 && !statusFilters.includes(item.status)) return false
    return true
  })

  function toggleCategory(cat: EquipmentCategory) {
    equipment.setCategoryFilters(
      equipment.categoryFilters.includes(cat)
        ? equipment.categoryFilters.filter((c) => c !== cat)
        : [...equipment.categoryFilters, cat]
    )
  }

  function toggleStatus(status: EquipmentStatus) {
    setStatusFilters(
      statusFilters.includes(status)
        ? statusFilters.filter((s) => s !== status)
        : [...statusFilters, status]
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          icon={<Search />}
          placeholder="Search equipment..."
          value={equipment.searchQuery}
          onChange={(e) => equipment.setSearchQuery(e.target.value)}
        />
        <Drawer>
          <Drawer.Trigger>
            <Button variant="secondary" icon={<SlidersHorizontal />}>
              Filters
              {hasActiveFilters && (
                <Badge label={String(activeFilterCount)} color="blue" />
              )}
            </Button>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
              <Drawer.Header className="flex-col !items-start gap-0.5">
                <div className="flex w-full items-center">
                  <Label.md className="flex-1">Filter & Sort</Label.md>
                  <Drawer.Close>
                    <Button.Icon variant="ghost" icon={<X />} aria-label="Close filters" />
                  </Drawer.Close>
                </div>
                <Paragraph.xs className="text-secondary">Narrow down and order your equipment</Paragraph.xs>
              </Drawer.Header>

              <Tabs defaultTab="filters">
                <Tabs.List>
                  <Tabs.Tab value="filters">Filters</Tabs.Tab>
                  <Tabs.Tab value="sort">Sort</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panels>
                  <Tabs.Panel value="filters" className="p-4">
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <Label.xs className="text-tertiary">Category</Label.xs>
                        <div className="grid grid-cols-2 gap-1.5">
                          {EQUIPMENT_CATEGORIES.map((cat) => (
                            <Checkbox
                              key={cat}
                              checked={equipment.categoryFilters.includes(cat)}
                              onChange={() => toggleCategory(cat)}
                            >
                              <Label.xs>{EQUIPMENT_CATEGORY_LABELS[cat]}</Label.xs>
                            </Checkbox>
                          ))}
                        </div>
                      </div>

                      <Divider />

                      <div className="flex flex-col gap-2">
                        <Label.xs className="text-tertiary">Status</Label.xs>
                        <div className="grid grid-cols-2 gap-1.5">
                          {EQUIPMENT_STATUSES.map((status) => (
                            <Checkbox
                              key={status}
                              checked={statusFilters.includes(status)}
                              onChange={() => toggleStatus(status)}
                            >
                              <Label.xs>{EQUIPMENT_STATUS_LABELS[status]}</Label.xs>
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Tabs.Panel>

                  <Tabs.Panel value="sort" className="p-4">
                    <Paragraph.sm className="text-tertiary">Sort options coming soon.</Paragraph.sm>
                  </Tabs.Panel>
                </Tabs.Panels>
              </Tabs>

              <Drawer.Footer className="mt-auto">
                <Drawer.Close className="w-full">
                  <Button className="w-full">Done</Button>
                </Drawer.Close>
              </Drawer.Footer>
            </Drawer.Panel>
          </Drawer.Portal>
        </Drawer>
      </div>

      {equipment.error && (
        <Alert title="Failed to load equipment" description={equipment.error} variant="error" style="outline" />
      )}

      <Decision value={filteredItems} loading={equipment.loading}>
        <Decision.Loading>
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState
            icon={<PackageOpen />}
            title="No equipment found"
            description="No available equipment matches your search. Try a different search term or adjust your filters."
          />
        </Decision.Empty>
        <Decision.Data>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                selected={state.data.equipmentIds.includes(item.id)}
                onSelect={onToggle}
              />
            ))}
          </div>
        </Decision.Data>
      </Decision>
    </div>
  )
}
