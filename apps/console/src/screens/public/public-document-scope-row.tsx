import { cn } from "@moc/utils/cn";
import { Paragraph } from "@moc/ui/components/display/text";

export function PublicDocumentScopeRow({ scope, reason, last }: { scope: string; reason: string; last?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[10rem_1fr] gap-4 px-4 py-2", !last && "border-b border-secondary")}>
      <code className="min-w-0 break-all paragraph-sm font-mono text-primary">{scope}</code>
      <Paragraph.sm className="text-tertiary">{reason}</Paragraph.sm>
    </div>
  )
}
