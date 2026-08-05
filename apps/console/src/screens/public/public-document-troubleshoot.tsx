import { Label, Paragraph } from "@moc/ui/components/display/text";

export function PublicDocumentTroubleshoot({ problem, fix }: { problem: string; fix: string }) {
  return (
    <div className="mb-4">
      <Label.md className="mb-1 block">{problem}</Label.md>
      <Paragraph.md className="text-tertiary">{fix}</Paragraph.md>
    </div>
  )
}
