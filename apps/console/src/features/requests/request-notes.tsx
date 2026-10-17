import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";

export function RequestNotes({ request }: { request: Request }) {
  if (!request.notes) return null;
  return <div><Label.sm className="block pb-3 text-primary">Notes</Label.sm><Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm></div>;
}
