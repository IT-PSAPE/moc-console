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
      <div ref={setDragRef} style={style} className="group/item flex w-full items-center gap-1 px-3 py-1.5 transition-colors hover:bg-background-primary-hover">
        <span {...listeners} {...attributes} className="shrink-0 cursor-grab touch-none text-quaternary opacity-100 transition-opacity hover:text-secondary md:opacity-0 md:group-hover/item:opacity-100"><GripVertical className="size-4" /></span>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Checkbox aria-label={item.checked ? `Mark ${item.label} incomplete` : `Mark ${item.label} complete`} checked={item.checked} onChange={toggle} />
          <InlineEditableText value={item.label} onSave={rename} className={cn("label-sm min-w-0 flex-1", item.checked && "text-tertiary line-through")} />
        </div>
        {ItemSlot && <div className="shrink-0"><ItemSlot item={item} /></div>}
        <Button.Icon aria-label="Delete item" variant="ghost" icon={<Trash2 />} className="shrink-0 !p-1 text-quaternary opacity-100 transition-opacity hover:text-secondary md:opacity-0 md:group-hover/item:opacity-100" onClick={remove} />
      </div>
    </div>
  );
}
