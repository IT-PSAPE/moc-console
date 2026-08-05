import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export function DraggableSectionHandle({ sectionId }: { sectionId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `section:${sectionId}` });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : undefined };
  return <span ref={setNodeRef} style={style} {...listeners} {...attributes} className="shrink-0 cursor-grab touch-none text-quaternary opacity-100 transition-opacity hover:text-secondary md:opacity-0 md:group-hover/section:opacity-100"><GripVertical className="size-4" /></span>;
}
