import { Paragraph } from "@moc/ui/components/display/text";

export function PublicDocumentScopeRow({ scope, reason, last }: { scope: string; reason: string; last?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 px-4 py-3 ${last ? "" : "border-b border-tertiary"}`}>
      <code className="font-mono text-sm text-primary">{scope}</code>
      <Paragraph.sm className="text-tertiary">{reason}</Paragraph.sm>
    </div>
  )
}
