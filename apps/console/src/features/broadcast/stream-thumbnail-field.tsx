import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { Select } from "@moc/ui/components/form/select"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { FileDropzone } from "@moc/ui/components/form/file-dropzone"
import { Paragraph } from "@moc/ui/components/display/text"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import type { MediaItem } from "@moc/types/broadcast/media-item"
import type { ThumbnailSource } from "@/data/mutate-streams"
import { Image, Link, X } from "lucide-react"

type ThumbnailMode = "file" | "url" | "media"

type StreamThumbnailFieldProps = {
  thumbnail: ThumbnailSource
  thumbnailFileName: string | undefined
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
  thumbnail,
  thumbnailFileName,
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

      {thumbnail ? (
        <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
          {thumbnail.type === "url" && (
            <img src={thumbnail.url} alt="" className="size-8 rounded object-cover shrink-0" />
          )}
          <Paragraph.sm className="text-secondary truncate flex-1">{thumbnailFileName}</Paragraph.sm>
          <Button.Icon variant="ghost" icon={<X className="size-3.5" />} onClick={onClear} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
              fileName={thumbnailFileName}
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
                No images found in your media library.
              </Paragraph.xs>
            )
          )}

          <Paragraph.xs className="text-quaternary">
            JPEG or PNG, 1280x720 recommended, max 2 MB.
          </Paragraph.xs>
        </div>
      )}
    </div>
  )
}
