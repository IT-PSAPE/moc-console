import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@moc/utils/cn";

export function DroppableZone({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} className={cn(className, isOver && "rounded bg-brand/5")}>{children}</div>;
}
