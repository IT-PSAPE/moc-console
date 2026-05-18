import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { Select } from "@moc/ui/components/form/select"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { FileDropzone } from "@moc/ui/components/form/file-dropzone"
import { Paragraph } from "@moc/ui/components/display/text"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { MediaItem } from "@moc/types/broadcast/media-item"
import { Image, Link, Loader2, X } from "lucide-react"

type ThumbnailMode = "file" | "url" | "media"
export type ThumbnailStatus = "idle" | "resolving" | "ready" | "error"

type StreamThumbnailFieldProps = {
  // Whether the user has actively selected a new thumbnail (vs. just the
  // stream's existing one shown for reference in edit mode).
  hasSelection: boolean
  selectionName: string | undefined
  // Object URL of the resolved blob, or — in edit mode with no new
  // selection — the stream's current thumbnail URL, for a static preview.
  previewUrl: string | null
  status: ThumbnailStatus
  errorMessage: string | null
  thumbnailUrlInput: string
  thumbnailMode: ThumbnailMode
  imageMedia: MediaItem[]
  onModeChange: (mode: ThumbnailMode) => void
  onFileSelect: (file: File | null) => void
  onUrlInputChange: (value: string) => void
  onUrlConfirm: () => void
  onMediaSelect: (mediaId: string) => void
  onClear: () => void
}

export function StreamThumbnailField({
  hasSelection,
  selectionName,
  previewUrl,
  status,
  errorMessage,
  thumbnailUrlInput,
  thumbnailMode,
  imageMedia,
  onModeChange,
  onFileSelect,
  onUrlInputChange,
  onUrlConfirm,
  onMediaSelect,
  onClear,
}: StreamThumbnailFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FormLabel label="Thumbnail" optional />

      {hasSelection ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
            {previewUrl && (
              <img src={previewUrl} alt="" className="size-8 rounded object-cover shrink-0" />
            )}
            <Paragraph.sm className="text-secondary truncate flex-1">{selectionName}</Paragraph.sm>
            {status === "resolving" && (
              <Loader2 className="size-3.5 animate-spin text-quaternary shrink-0" />
            )}
            <Button.Icon variant="ghost" icon={<X className="size-3.5" />} onClick={onClear} />
          </div>
          {status === "resolving" && (
            <Paragraph.xs className="text-quaternary">Checking image…</Paragraph.xs>
          )}
          {status === "error" && errorMessage && (
            <Paragraph.xs className="text-utility-red-700">{errorMessage}</Paragraph.xs>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {previewUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
              <img src={previewUrl} alt="" className="size-8 rounded object-cover shrink-0" />
              <Paragraph.sm className="text-quaternary truncate flex-1">
                Current thumbnail — choose a source below to replace it.
              </Paragraph.sm>
            </div>
          )}

          <SegmentedControl
            fill
            value={thumbnailMode}
            onValueChange={(v: string) => onModeChange(v as ThumbnailMode)}
          >
            <SegmentedControl.Item value="file">Upload</SegmentedControl.Item>
            <SegmentedControl.Item value="url">URL</SegmentedControl.Item>
            <SegmentedControl.Item value="media" icon={<Image className="size-3.5" />}>Media</SegmentedControl.Item>
          </SegmentedControl>

          {thumbnailMode === "file" && (
            <FileDropzone
              accept="image/jpeg,image/png"
              onFileSelect={onFileSelect}
              placeholder="Drop a thumbnail image or click to browse."
              selectedHint="Drop a new image or click to replace."
            />
          )}

          {thumbnailMode === "url" && (
            <div className="flex gap-2">
              <Input
                icon={<Link className="size-3.5" />}
                value={thumbnailUrlInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onUrlInputChange(e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
                className="flex-1"
              />
              <Button variant="secondary" onClick={onUrlConfirm} disabled={!thumbnailUrlInput.trim()}>
                Set
              </Button>
            </div>
          )}

          {thumbnailMode === "media" && (
            imageMedia.length > 0 ? (
              <Select
                value=""
                onChange={(e: ChangeEvent<HTMLSelectElement>) => onMediaSelect(e.target.value)}
              >
                <option value="" disabled>
                  Select an image from media library...
                </option>
                {imageMedia.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Paragraph.xs className="text-quaternary py-2">
                No usable images found in your media library.
              </Paragraph.xs>
            )
          )}

          {status === "error" && errorMessage && (
            <Paragraph.xs className="text-utility-red-700">{errorMessage}</Paragraph.xs>
          )}

          <Paragraph.xs className="text-quaternary">
            JPEG or PNG, 1280x720 recommended, max 2 MB.
          </Paragraph.xs>
        </div>
      )}
    </div>
  )
}
