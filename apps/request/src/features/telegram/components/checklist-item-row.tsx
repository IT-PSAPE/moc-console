import { Checkbox } from "@moc/ui/components/form/checkbox"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { cn } from "@moc/utils/cn"
import type { MiniAppChecklistItem } from "@moc/notifications"
import type { ChangeEvent } from "react"

type ChecklistItemRowProps = {
  item: MiniAppChecklistItem
  isPending: boolean
  onToggle: (itemId: string, checked: boolean) => void
}

export function ChecklistItemRow({ item, isPending, onToggle }: ChecklistItemRowProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onToggle(item.id, event.target.checked)
  }

  return (
    <Checkbox checked={item.checked} disabled={!item.canToggle || isPending} onChange={handleChange}>
      <div className="flex flex-col">
        <Label.sm className={cn(item.checked && "text-tertiary line-through")}>{item.label}</Label.sm>
        {item.assigneeNames.length > 0 && (
          <Paragraph.xs className="text-tertiary">{item.assigneeNames.join(", ")}</Paragraph.xs>
        )}
      </div>
    </Checkbox>
  )
}
