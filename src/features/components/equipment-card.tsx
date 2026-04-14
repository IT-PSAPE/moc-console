import { Card } from '@/components/display/card'
import { Badge } from '@/components/display/badge'
import { Label, Paragraph } from '@/components/display/text'
import { cn } from '@/utils/cn'
import { MapPin } from 'lucide-react'
import { EQUIPMENT_CATEGORY_LABELS } from '../constants'
import type { PublicEquipmentItem } from '@/types/equipment'

export function EquipmentCard({ item, selected, onSelect }: { item: PublicEquipmentItem; selected: boolean; onSelect: (id: string) => void }) {
  const available = item.isAvailable

  function handleClick() {
    if (!available) return
    onSelect(item.id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!available) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(item.id)
    }
  }

  return (
    <div
      className={cn(
        'rounded-lg transition-all',
        available ? 'cursor-pointer hover:shadow-sm active:scale-[0.98]' : 'opacity-50 cursor-not-allowed'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={available ? 0 : -1}
      aria-disabled={!available}
    >
      <Card.Root className={cn(
        'transition-colors pointer-events-none',
        available && 'hover:border-brand',
        selected && 'border-brand ring-2 ring-border-brand/20'
      )}>
        <Card.Content className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <Label.sm className="line-clamp-1">{item.name}</Label.sm>
            {available
              ? <Badge label={EQUIPMENT_CATEGORY_LABELS[item.category]} color="blue" variant="outline" />
              : <Badge label="Not Available" color="red" variant="outline" />
            }
          </div>
          <div className="flex items-center gap-1.5 text-tertiary">
            <MapPin className="size-3.5" />
            <Paragraph.xs className="text-tertiary">{item.location}</Paragraph.xs>
          </div>
          <Paragraph.xs className="text-quaternary">{item.serialNumber}</Paragraph.xs>
        </Card.Content>
      </Card.Root>
    </div>
  )
}
