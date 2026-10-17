import { Card } from "@moc/ui/components/display/card";
import { Label, Paragraph } from "@moc/ui/components/display/text";

export function PublicDocumentTroubleshoot({ problem, fix }: { problem: string; fix: string }) {
  return (
    <Card className="mb-3 p-4">
      <Label.sm className="mb-1 block text-primary">{problem}</Label.sm>
      <Paragraph.sm className="text-tertiary">{fix}</Paragraph.sm>
    </Card>
  )
}
