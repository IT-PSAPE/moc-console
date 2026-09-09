import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { cn } from "@moc/utils/cn";

export function RequestFlow({ request, className }: { request: Request; className?: string }) {
  if (!request.flow) return null;
  return <div className={cn(className)}><Label.md className="block pb-3">Flow</Label.md><Paragraph.sm className="text-tertiary">{request.flow}</Paragraph.sm></div>;
}
