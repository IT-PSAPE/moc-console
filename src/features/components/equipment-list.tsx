import { Input } from '@/components/form/input'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { Badge } from '@/components/display/badge'
import { Decision } from '@/components/display/decision'
import { Search, PackageOpen } from 'lucide-react'
import { EquipmentCard } from './equipment-card'
import type { PublicEquipmentItem } from '@/types/equipment'

type EquipmentListProps = {
  items: PublicEquipmentItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  loading: boolean
}

export function EquipmentList({ items, selectedIds, onToggle, searchQuery, onSearchChange, loading }: EquipmentListProps) {
  const selectedCount = selectedIds.length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Input
          className="flex-1"
          icon={<Search />}
          placeholder="Search equipment..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {selectedCount > 0 && (
          <Badge label={`${selectedCount} selected`} color="blue" />
        )}
      </div>

      <Decision.Root value={items} loading={loading}>
        <Decision.Loading>
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState
            icon={<PackageOpen />}
            title="No equipment found"
            description="No available equipment matches your search. Try a different search term."
          />
        </Decision.Empty>
        <Decision.Data>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <EquipmentCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onSelect={onToggle}
              />
            ))}
          </div>
        </Decision.Data>
      </Decision.Root>
    </div>
  )
}
