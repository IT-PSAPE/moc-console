import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import type { FileRejection } from "@moc/utils/file-constraints"
import { FileWarning, X } from "lucide-react"

type BroadcastRejectedFilesProps = {
  onDismiss: () => void
  rejections: FileRejection[]
}

// Rejected files stay listed with their reason after the toast has gone, so a
// user who dropped a folder of sidecar files can see exactly what was skipped
// and why rather than silently ending up with a shorter playlist.
export function BroadcastRejectedFiles({ onDismiss, rejections }: BroadcastRejectedFilesProps) {
  if (rejections.length === 0) return null

  const fileLabel = rejections.length === 1 ? "file was" : "files were"

  function renderRejection(rejection: FileRejection) {
    return (
      <li key={`${rejection.file.name}:${rejection.file.size}:${rejection.reason}`} className="flex flex-col gap-0.5">
        <Paragraph.xs className="truncate text-secondary">{rejection.file.name}</Paragraph.xs>
        <Paragraph.xs className="text-error">{rejection.reason}</Paragraph.xs>
      </li>
    )
  }

  return (
    <div role="alert" aria-live="polite" className="flex flex-col gap-2 rounded-md border border-error_subtle bg-error-primary px-3 py-2.5">
      <div className="flex items-start gap-2">
        <FileWarning className="size-4 shrink-0 text-error" />
        <Paragraph.xs className="flex-1 text-secondary">{`${rejections.length} ${fileLabel} not added to the playlist.`}</Paragraph.xs>
        <Button.Icon aria-label="Dismiss rejected files" variant="ghost" icon={<X />} onClick={onDismiss} />
      </div>
      <ul className="flex flex-col gap-1.5 pl-6">{rejections.map(renderRejection)}</ul>
    </div>
  )
}
