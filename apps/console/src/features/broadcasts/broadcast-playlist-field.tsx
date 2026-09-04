import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { BROADCAST_FILE_ACCEPT, BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { Paragraph } from "@moc/ui/components/display/text"
import { Progress } from "@moc/ui/components/feedback/progress"
import { FileDropzone } from "@moc/ui/components/form/file-dropzone"
import { FormField } from "@moc/ui/components/form/form-label"
import type { BroadcastEditorItem } from "./broadcast-editor-types"
import { BroadcastPlaylistItem } from "./broadcast-playlist-item"

type BroadcastPlaylistFieldProps = {
  error?: string
  isLocked: boolean
  items: BroadcastEditorItem[]
  kind: BroadcastKind
  onFilesAdd: (files: File[]) => void
  onItemMove: (key: string, direction: -1 | 1) => void
  onItemRemove: (key: string) => void
  uploadProgress: { complete: number; total: number }
}

export function BroadcastPlaylistField({ error, isLocked, items, kind, onFilesAdd, onItemMove, onItemRemove, uploadProgress }: BroadcastPlaylistFieldProps) {
  const mediaLabel = BROADCAST_KIND_LABELS[kind].toLowerCase()

  function renderItem(item: BroadcastEditorItem, index: number) {
    return (
      <BroadcastPlaylistItem
        key={item.key}
        isFirst={index === 0}
        isLast={index === items.length - 1}
        isLocked={isLocked}
        item={item}
        kind={kind}
        onMove={onItemMove}
        onRemove={onItemRemove}
      />
    )
  }

  return (
    <FormField label="Playlist" required>
      <div aria-busy={isLocked || undefined} className="flex flex-col gap-3">
        <FileDropzone
          accept={BROADCAST_FILE_ACCEPT[kind]}
          multiple
          onFilesSelect={onFilesAdd}
          placeholder={`Drop ${mediaLabel} files or click to browse.`}
          hint="New files are added to the end of the playlist."
          selectedHint="New files are added to the end of the playlist."
        />
        {error ? <Paragraph.xs role="alert" aria-live="polite" className="text-error">{error}</Paragraph.xs> : null}
        {items.length > 0 ? (
          <div className="flex flex-col gap-1.5">{items.map(renderItem)}</div>
        ) : (
          <Paragraph.xs className="text-quaternary">Files play top to bottom. Reorder them before saving.</Paragraph.xs>
        )}
        {uploadProgress.total > 0 && isLocked ? (
          <div className="flex flex-col gap-1.5">
            <Progress aria-label="Upload progress" max={uploadProgress.total} value={uploadProgress.complete} />
            <Paragraph.xs role="status" aria-live="polite" className="text-quaternary">{`${uploadProgress.complete} of ${uploadProgress.total} new files uploaded`}</Paragraph.xs>
          </div>
        ) : null}
      </div>
    </FormField>
  )
}
