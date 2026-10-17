import { Check, GripVertical } from "lucide-react";
import { Paragraph } from "@moc/ui/components/display/text";
import type { ChecklistItem } from "@moc/types/checklists";
import { cn } from "@moc/utils/cn";

export function CheckRowGhost({ item }: { item: ChecklistItem }) {
  return (
    <div className="flex min-h-control rotate-1 scale-[1.02] items-center gap-3 rounded-lg border border-primary bg-primary px-3 py-2.5 opacity-90 shadow-lg">
      <span className="shrink-0 text-quaternary"><GripVertical className="size-4" /></span>
      <div className={cn("flex size-4 shrink-0 items-center justify-center rounded border shadow-xs", item.checked ? "border-transparent bg-brand_solid" : "border-primary bg-primary")}>{item.checked && <Check className="size-3 text-on-brand" />}</div>
      <Paragraph.sm className={cn(item.checked && "text-tertiary line-through")}>{item.label}</Paragraph.sm>
    </div>
  );
}
