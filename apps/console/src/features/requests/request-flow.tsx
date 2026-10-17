import { Label, Paragraph } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";

export function RequestFlow({ request }: { request: Request }) {
  if (!request.flow) return null;
  return <div><Label.sm className="block pb-3 text-primary">Flow of events</Label.sm><Paragraph.sm className="text-tertiary">{request.flow}</Paragraph.sm></div>;
}
