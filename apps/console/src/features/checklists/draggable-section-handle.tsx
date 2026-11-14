import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Drag } from "iconoir-react";
import { Button } from "@moc/ui/components/controls/button";

// Keep the drag measurement/transform on a non-interactive wrapper while the
// shared icon button owns the keyboard interaction and responsive target size.
export function DraggableSectionHandle({ sectionId }: { sectionId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `section:${sectionId}` });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : undefined };
  return (
    <span ref={setNodeRef} style={style} className="inline-flex shrink-0">
      <Button.Icon
        {...listeners}
        {...attributes}
        aria-label={`Reorder checklist section ${sectionId}`}
        variant="ghost"
        size="sm"
        icon={<Drag />}
        className="cursor-grab touch-none text-quaternary opacity-0 transition-opacity focus-visible:opacity-100 group-hover/section:opacity-100 landscape:opacity-100"
      />
    </span>
  );
}
