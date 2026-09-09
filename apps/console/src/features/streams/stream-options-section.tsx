import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react"
import { Select } from "@moc/ui/components/form/select"
import { Input } from "@moc/ui/components/form/input"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Accordion } from "@moc/ui/components/display/accordion"
import type { YouTubeCategory, YouTubePlaylist } from "@moc/types/streams/stream"
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
  const categoryItems = [
    { label: "None", value: "" },
    ...categories.map((category) => ({ label: category.title, value: category.id })),
  ]
  const playlistItems = [
    { label: "None", value: "" },
    ...playlists.map((playlist) => ({ label: `${playlist.title} (${playlist.itemCount} items)`, value: playlist.id })),
  ]

  function handleCategoryChange(value: string | null) {
    onCategoryChange(value || null)
  }

  function handlePlaylistChange(value: string | null) {
    onPlaylistChange(value || null)
  }

  function handleTagInputChange(event: ChangeEvent<HTMLInputElement>) {
    onTagInputChange(event.target.value)
  }

  function handleRemoveTag(event: MouseEvent<HTMLButtonElement>) {
    const tag = event.currentTarget.dataset.tag
    if (tag) onRemoveTag(tag)
  }

  return (
    <Accordion.Item value="optionals">
      <Accordion.Trigger className="flex items-center gap-2 py-2 text-left">
        <Label.sm className="flex-1">Options</Label.sm>
        <ChevronDown className="size-4 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="flex flex-col gap-4 pb-2 pt-1">
          {/* ─── Category ─── */}
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Category" optional />
            <Select.Root name="stream-category" items={categoryItems} value={categoryId ?? ""} onValueChange={handleCategoryChange}>
              <Select.Trigger aria-label="Category" />
              <Select.Content>
              <Select.Item value="">None</Select.Item>
              {categories.map((cat) => (
                <Select.Item key={cat.id} value={cat.id}>
                  {cat.title}
                </Select.Item>
              ))}
              </Select.Content>
            </Select.Root>
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
                    aria-label={`Remove ${tag}`}
                    variant="ghost"
                    icon={<X className="size-3" />}
                    data-tag={tag}
                    onClick={handleRemoveTag}
                  />
                </span>
              ))}
              <Input
                aria-label="Add stream tag"
                name="stream-tag"
                autoComplete="off"
                style="ghost"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={onTagKeyDown}
                onBlur={onTagBlur}
                placeholder={tags.length === 0 ? "Add tags…" : ""}
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
            <Select.Root name="stream-playlist" items={playlistItems} value={playlistId ?? ""} onValueChange={handlePlaylistChange}>
              <Select.Trigger aria-label="Playlist" />
              <Select.Content>
              <Select.Item value="">None</Select.Item>
              {playlists.map((pl) => (
                <Select.Item key={pl.id} value={pl.id}>
                  {pl.title} ({pl.itemCount} items)
                </Select.Item>
              ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>
      </Accordion.Content>
    </Accordion.Item>
  )
}
