import type { ChangeEvent, KeyboardEvent } from "react"
import { Select } from "@moc/ui/components/form/select"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Accordion } from "@moc/ui/components/display/accordion"
import type { YouTubeCategory, YouTubePlaylist } from "@moc/types/broadcast/stream"
import { ChevronDown, X } from "lucide-react"

type StreamOptionsSectionProps = {
  categoryId: string | null
  categories: YouTubeCategory[]
  tags: string[]
  tagInput: string
  playlistId: string | null
  playlists: YouTubePlaylist[]
  onCategoryChange: (categoryId: string | null) => void
  onTagInputChange: (value: string) => void
  onTagKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  onTagBlur: () => void
  onRemoveTag: (tag: string) => void
  onPlaylistChange: (playlistId: string | null) => void
}

export function StreamOptionsSection({
  categoryId,
  categories,
  tags,
  tagInput,
  playlistId,
  playlists,
  onCategoryChange,
  onTagInputChange,
  onTagKeyDown,
  onTagBlur,
  onRemoveTag,
  onPlaylistChange,
}: StreamOptionsSectionProps) {
  return (
    <Accordion.Item value="optionals">
      <Accordion.Trigger className="flex items-center gap-2 py-2 text-left">
        <Label.sm className="flex-1">Options</Label.sm>
        <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-4 pb-2 pt-1">
          {/* ─── Category ─── */}
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Category" optional />
            <Select
              value={categoryId ?? ""}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => onCategoryChange(e.target.value || null)}
            >
              <option value="">None</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </Select>
          </div>

          {/* ─── Tags ─── */}
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Tags" optional />
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-secondary bg-primary px-3 py-2 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary"
                >
                  {tag}
                  <Button.Icon
                    variant="ghost"
                    icon={<X className="size-3" />}
                    onClick={() => onRemoveTag(tag)}
                  />
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onTagInputChange(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={onTagBlur}
                placeholder={tags.length === 0 ? "Add tags..." : ""}
                className="min-w-[80px] flex-1 bg-transparent text-sm text-primary placeholder:text-quaternary outline-none"
              />
            </div>
            <Paragraph.xs className="text-quaternary">
              Press Enter or comma to add. Max 500 characters total.
            </Paragraph.xs>
          </div>

          {/* Playlist */}
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Add to Playlist" optional />
            <Select
              value={playlistId ?? ""}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => onPlaylistChange(e.target.value || null)}
            >
              <option value="">None</option>
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.title} ({pl.itemCount} items)
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}
