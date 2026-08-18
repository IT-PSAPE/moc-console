import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@moc/utils/cn";

/**
 * The hover state is an outline, not a tint: a neutral fill is within ~1.3:1 of
 * the panel surface in one theme or the other, and this zone is the only feedback
 * a drop into a group gets — the indicator line is suppressed while the container
 * itself is the drop target.
 */
export function DroppableZone({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cn(className, isOver && "rounded ring-1 ring-inset ring-text-quaternary")}>{children}</div>;
}
