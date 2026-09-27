import { Divider } from "@moc/ui/components/display/divider"
import { Label } from "@moc/ui/components/display/text"
import { ChecklistItemRow } from "./checklist-item-row"
import type { MiniAppChecklistSection } from "@moc/notifications"

type ChecklistSectionViewProps = {
  section: MiniAppChecklistSection
  pendingItemIds: ReadonlySet<string>
  onToggle: (itemId: string, checked: boolean) => void
}

export function ChecklistSectionView({ section, pendingItemIds, onToggle }: ChecklistSectionViewProps) {
  return (
    <section className="flex flex-col gap-3">
      <Label.xs className="uppercase tracking-wider text-tertiary">{section.name}</Label.xs>
      <div className="flex flex-col gap-3">
        {section.items.map((item, index) => (
          <div key={item.id} className="flex flex-col gap-3">
            {index > 0 && <Divider />}
            <ChecklistItemRow item={item} isPending={pendingItemIds.has(item.id)} onToggle={onToggle} />
          </div>
        ))}
      </div>
    </section>
  )
}
