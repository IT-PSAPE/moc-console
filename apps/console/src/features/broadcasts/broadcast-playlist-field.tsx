import { DividedList } from "@moc/ui/components/display/divided-list"
import { SortableList } from "@moc/ui/components/display/sortable-list"
import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { BROADCAST_FILE_ACCEPT, BROADCAST_KIND_LABELS, BROADCAST_MAX_FILE_BYTES, BROADCAST_MIN_FILE_BYTES } from "@moc/types/broadcast/broadcast-constants"
import { Paragraph } from "@moc/ui/components/display/text"
import { Progress } from "@moc/ui/components/feedback/progress"
import type { FilePartition, FileRejection } from "@moc/utils/file-constraints"
import { FileDropzone } from "@moc/ui/components/form/file-dropzone"
import { FormField } from "@moc/ui/components/form/form-label"
import type { BroadcastEditorItem } from "./broadcast-editor-types"
import { getBroadcastFileHint } from "./broadcast-file-check"
import { BroadcastPlaylistItem } from "./broadcast-playlist-item"
import { BroadcastRejectedFiles } from "./broadcast-rejected-files"

type BroadcastPlaylistFieldProps = {
  error?: string
  isChecking: boolean
  isLocked: boolean
  items: BroadcastEditorItem[]
  kind: BroadcastKind
  onFilesAdd: (batch: FilePartition) => void
  onItemReorder: (activeId: string, overId: string) => void
  onItemRemove: (key: string) => void
  onRejectionsDismiss: () => void
  rejections: FileRejection[]
  uploadProgress: { complete: number; total: number }
}

export function BroadcastPlaylistField({ error, isChecking, isLocked, items, kind, onFilesAdd, onItemReorder, onItemRemove, onRejectionsDismiss, rejections, uploadProgress }: BroadcastPlaylistFieldProps) {
  const mediaLabel = BROADCAST_KIND_LABELS[kind].toLowerCase()
  const itemIds = items.map((item) => item.key)

  function handleReorder(activeId: string, overId: string) {
    onItemReorder(activeId, overId)
  }

  function renderItem(item: BroadcastEditorItem) {
    return (
      <SortableList.Item key={item.key} id={item.key} aria-label={item.source === "existing" ? item.item.title : item.file.name}>
        <BroadcastPlaylistItem isLocked={isLocked} item={item} kind={kind} onRemove={onItemRemove} />
      </SortableList.Item>
    )
  }

  return (
    <FormField label="Playlist" required>
      <div aria-busy={isLocked || isChecking || undefined} className="flex flex-col gap-3">
        <FileDropzone
          accept={BROADCAST_FILE_ACCEPT[kind]}
          maxSizeBytes={BROADCAST_MAX_FILE_BYTES[kind]}
          minSizeBytes={BROADCAST_MIN_FILE_BYTES}
          multiple
          onFilesChange={onFilesAdd}
          placeholder={`Drop ${mediaLabel} files or click to browse.`}
          hint={getBroadcastFileHint(kind)}
          selectedHint={getBroadcastFileHint(kind)}
          disabled={isLocked || isChecking}
        />
        {isChecking ? <Paragraph.xs role="status" aria-live="polite" className="text-quaternary">Checking files…</Paragraph.xs> : null}
        <BroadcastRejectedFiles rejections={rejections} onDismiss={onRejectionsDismiss} />
        {error ? <Paragraph.xs role="alert" aria-live="polite" className="text-error">{error}</Paragraph.xs> : null}
        {items.length > 0 ? (
          <SortableList.Root items={itemIds} onReorder={handleReorder} disabled={isLocked || isChecking}>
            <DividedList>{items.map(renderItem)}</DividedList>
          </SortableList.Root>
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
