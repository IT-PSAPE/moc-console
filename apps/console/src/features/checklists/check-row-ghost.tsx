import { Check, GripVertical } from "lucide-react";
import { Label } from "@moc/ui/components/display/text";
import type { ChecklistItem } from "@moc/types/checklists";
import { cn } from "@moc/utils/cn";

export function CheckRowGhost({ item }: { item: ChecklistItem }) {
  return (
    <div className="flex rotate-1 scale-[1.02] items-center gap-3 rounded-lg border border-brand bg-primary px-3 py-2.5 opacity-90 shadow-lg">
      <span className="shrink-0 text-quaternary"><GripVertical className="size-4" /></span>
      <div className={cn("flex size-5 shrink-0 items-center justify-center rounded border", item.checked ? "border-transparent bg-brand_solid" : "border-secondary bg-primary")}>{item.checked && <Check className="size-3.5 text-white" />}</div>
      <Label.sm className={cn(item.checked && "text-tertiary line-through")}>{item.label}</Label.sm>
    </div>
  );
}
