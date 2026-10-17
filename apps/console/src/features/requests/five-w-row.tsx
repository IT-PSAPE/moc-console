import { Label, Paragraph } from "@moc/ui/components/display/text";

// Two grid cells (label + value) meant to sit inside a parent
// `grid grid-cols-[6rem_1fr]` — see RequestFiveW.
export function FiveWRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <Label.sm className="text-tertiary">{label}</Label.sm>
      <Paragraph.sm className="text-primary">{value}</Paragraph.sm>
    </>
  );
}
