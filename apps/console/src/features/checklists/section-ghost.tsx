import { ChevronDown, GripVertical } from "lucide-react";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { ChecklistSection } from "@moc/types/checklists";

export function SectionGhost({ section }: { section: ChecklistSection }) {
  const checkedCount = section.items.filter((item) => item.checked).length;
  return (
    <div className="flex rotate-1 scale-[1.02] items-center gap-2 rounded-lg border border-primary bg-primary px-3 py-2.5 opacity-90 shadow-lg">
      <GripVertical className="size-4 text-quaternary" /><ChevronDown className="size-4 text-tertiary" />
      <Label.sm className="flex-1">{section.name}</Label.sm><Paragraph.xs className="text-tertiary">{checkedCount}/{section.items.length}</Paragraph.xs>
    </div>
  );
}
