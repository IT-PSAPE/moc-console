import { Label, Paragraph } from "@moc/ui/components/display/text";

export function FiveWRow({ label, value }: { label: string; value: string }) {
  return <div><Label.sm className="text-primary">{label}: </Label.sm><Paragraph.sm className="inline text-tertiary">{value}</Paragraph.sm></div>;
}
