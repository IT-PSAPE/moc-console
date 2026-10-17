import type { ComponentType } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@moc/ui/components/controls/button";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text";
import type { ChecklistItem } from "@moc/types/checklists";
import { cn } from "@moc/utils/cn";

type DraggableCheckRowProps = {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  itemSlot?: ComponentType<{ item: ChecklistItem }>;
};

export function DraggableCheckRow({ item, onToggle, onRename, onDelete, itemSlot: ItemSlot }: DraggableCheckRowProps) {
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: `item:${item.id}` });
  const { setNodeRef: setDropRef } = useDroppable({ id: `item:${item.id}` });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : undefined };
  function toggle() { onToggle(item.id); }
  function rename(label: string) { onRename(item.id, label); }
  function remove() { onDelete(item.id); }

  return (
    <div ref={setDropRef}>
      <div ref={setDragRef} style={style} className="group/item relative flex min-h-control w-full items-center gap-3 pr-5 transition-colors hover:bg-tertiary">
        <Button.Icon
          {...listeners}
          {...attributes}
          aria-label={`Reorder ${item.label}`}
          variant="ghost"
          size="sm"
          icon={<GripVertical />}
          className="absolute right-full top-1/2 -translate-y-1/2 cursor-grab touch-none text-quaternary opacity-0 transition-opacity focus-visible:opacity-100 group-hover/item:opacity-100 landscape:opacity-100"
        />
        <Checkbox aria-label={item.checked ? `Mark ${item.label} incomplete` : `Mark ${item.label} complete`} checked={item.checked} onChange={toggle} />
        <InlineEditableText value={item.label} onSave={rename} className={cn("paragraph-sm min-w-0 flex-1", item.checked && "text-tertiary line-through")} />
        {ItemSlot && <div className="shrink-0"><ItemSlot item={item} /></div>}
        <Button.Icon aria-label="Delete item" variant="ghost" size="sm" icon={<Trash2 />} className="shrink-0 text-quaternary opacity-0 transition-opacity group-hover/item:opacity-100 landscape:opacity-100" onClick={remove} />
      </div>
    </div>
  );
}
