import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@moc/ui/components/controls/button";
import { cn } from "@moc/utils/cn";

// `setNodeRef` carries the measurement/transform node: `Button.Icon` doesn't
// forward a ref, so it wraps a plain inline span that holds the ref instead.
export function DraggableSectionHandle({ sectionId, className }: { sectionId: string; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `section:${sectionId}` });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : undefined };
  return (
    <span ref={setNodeRef} style={style} className={cn("inline-flex shrink-0", className)}>
      <Button.Icon
        {...listeners}
        {...attributes}
        aria-label={`Reorder checklist section ${sectionId}`}
        variant="ghost"
        size="sm"
        icon={<GripVertical />}
        className="cursor-grab touch-none text-quaternary opacity-0 transition-opacity focus-visible:opacity-100 group-hover/section:opacity-100 landscape:opacity-100"
      />
    </span>
  );
}
