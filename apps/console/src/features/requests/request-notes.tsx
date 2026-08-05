import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { cn } from "@moc/utils/cn";

export function RequestNotes({ request, className }: { request: Request; className?: string }) {
  if (!request.notes) return null;
  return <div className={cn(className)}><Label.md className="block pb-3">Notes</Label.md><Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm></div>;
}
