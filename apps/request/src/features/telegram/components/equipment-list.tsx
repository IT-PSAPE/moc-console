import { Check, Cube as Box } from '@phosphor-icons/react'
import { Divider } from "@moc/ui/components/display/divider"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import type { MiniAppEquipmentItem } from "@moc/notifications"

type EquipmentListProps = {
  items: MiniAppEquipmentItem[]
  scannedItemIds: ReadonlySet<string>
}

export function EquipmentList({ items, scannedItemIds }: EquipmentListProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={item.id} className="flex flex-col gap-3">
          {index > 0 && <Divider />}
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded bg-secondary text-quaternary">
              <Box className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <Label.sm className="block truncate">{item.name}</Label.sm>
              <Paragraph.xs className="text-tertiary">{item.serialNumber}</Paragraph.xs>
            </div>
            {scannedItemIds.has(item.id) && (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-success">
                <Check weight="regular" className="size-4" />
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
