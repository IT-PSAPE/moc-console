import { Badge } from '@moc/ui/components/display/badge'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { cn } from '@moc/utils/cn'
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
        'flex flex-col gap-2 rounded-lg p-3 transition-all border',
        available
          ? 'cursor-pointer hover:bg-secondary/60 active:scale-[0.98]'
          : 'opacity-50 cursor-not-allowed',
        selected
          ? 'border-brand bg-brand/5 ring-2 ring-utility-brand-400/20'
          : 'border-secondary bg-primary'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={available ? 0 : -1}
      aria-disabled={!available}
    >
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
    </div>
  )
}
