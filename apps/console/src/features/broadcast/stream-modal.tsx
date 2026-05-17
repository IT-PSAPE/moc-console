import { useCallback, useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Accordion } from "@moc/ui/components/display/accordion"
import type { Stream, StreamPreset, StreamPrivacy, LatencyPreference, YouTubeCategory, YouTubePlaylist } from "@moc/types/broadcast/stream"
import type { MediaItem } from "@moc/types/broadcast/media-item"
import type { ThumbnailSource } from "@/data/mutate-streams"
import { fetchCategories, fetchPlaylists } from "@/data/fetch-streams"
import { fetchMedia } from "@/data/fetch-broadcast"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time"
import { StreamBasicFields } from "./stream-basic-fields"
import { StreamThumbnailField } from "./stream-thumbnail-field"
import { StreamOptionsSection } from "./stream-options-section"
import { StreamAdvancedSection } from "./stream-advanced-section"

type StreamModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (params: StreamFormData) => Promise<void> | void
  stream?: Stream | null
  // Workspace-level defaults to pre-fill the form in create mode.
  preset?: StreamPreset | null
}

export type StreamFormData = {
  title: string
  description: string
  privacyStatus: StreamPrivacy
  isForKids: boolean
  scheduledStartTime: string | null
  categoryId: string | null
  tags: string[]
  latencyPreference: LatencyPreference
  enableDvr: boolean
  enableEmbed: boolean
  enableAutoStart: boolean
  enableAutoStop: boolean
  playlistId: string | null
  thumbnail: ThumbnailSource
  // When true in create mode, persist the current settings as the workspace preset.
  savePreset: boolean
}

export function StreamModal({ open, onOpenChange, onSubmit, stream, preset }: StreamModalProps) {
  const isEditing = Boolean(stream)
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { toast } = useFeedback()

  // In edit mode, seed state from the stream being edited.
  // In create mode, seed state from the workspace preset (if any).
  const seed = stream ?? preset ?? null
  const seedScheduledStart = stream ? stream.scheduledStartTime : preset?.scheduledStartTime ?? null
  const seedThumbnailUrl = stream ? stream.thumbnailUrl ?? null : preset?.thumbnailUrl ?? null

  // ─── Basic fields ──────────────────────────────────────
  const [title, setTitle] = useState(seed?.title ?? "")
  const [description, setDescription] = useState(seed?.description ?? "")
  const [privacyStatus, setPrivacyStatus] = useState<StreamPrivacy>(seed?.privacyStatus ?? "unlisted")
  const [isForKids, setIsForKids] = useState(seed?.isForKids ?? false)
  const [scheduledStartTime, setScheduledStartTime] = useState(
    seedScheduledStart ? formatUtcIsoForDateTimeInput(seedScheduledStart, browserTimeZone) : "",
  )
  const [savePreset, setSavePreset] = useState(false)

  // ─── Thumbnail ─────────────────────────────────────────
  const [thumbnail, setThumbnail] = useState<ThumbnailSource>(
    seedThumbnailUrl ? { type: "url", url: seedThumbnailUrl } : null,
  )
  const [thumbnailFileName, setThumbnailFileName] = useState<string | undefined>(
    seedThumbnailUrl ? (seedThumbnailUrl.split("/").pop() || "Preset thumbnail") : undefined,
  )
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState("")
  const [thumbnailMode, setThumbnailMode] = useState<"file" | "url" | "media">("file")

  // ─── Category, tags, playlist ──────────────────────────
  const [categoryId, setCategoryId] = useState<string | null>(seed?.categoryId ?? null)
  const [tags, setTags] = useState<string[]>(seed?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [playlistId, setPlaylistId] = useState<string | null>(seed?.playlistId ?? null)

  // ─── Advanced settings ─────────────────────────────────
  const [latencyPreference, setLatencyPreference] = useState<LatencyPreference>(seed?.latencyPreference ?? "normal")
  const [enableDvr, setEnableDvr] = useState(seed?.enableDvr ?? true)
  const [enableEmbed, setEnableEmbed] = useState(seed?.enableEmbed ?? true)
  const [enableAutoStart, setEnableAutoStart] = useState(seed?.enableAutoStart ?? false)
  const [enableAutoStop, setEnableAutoStop] = useState(seed?.enableAutoStop ?? true)

  // ─── Remote data ───────────────────────────────────────
  const [categories, setCategories] = useState<YouTubeCategory[]>([])
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const canSubmit = Boolean(title.trim()) && !isSubmitting

  // Filter media to only images (thumbnails must be images)
  const imageMedia = mediaItems.filter((m) => m.type === "image")

  // Fetch categories, playlists, and media when modal opens.
  // Collect failures and surface a single toast so a network outage doesn't
  // fire three notifications at once.
  useEffect(() => {
    if (!open) return
    const failures: string[] = []
    void Promise.all([
      fetchCategories().then(setCategories).catch((e) => {
        console.error("Failed to load YouTube categories", e)
        failures.push("categories")
      }),
      fetchPlaylists().then(setPlaylists).catch((e) => {
        console.error("Failed to load YouTube playlists", e)
        failures.push("playlists")
      }),
      fetchMedia().then(setMediaItems).catch((e) => {
        console.error("Failed to load media library", e)
        failures.push("media library")
      }),
    ]).then(() => {
      if (failures.length === 0) return
      toast({
        title: "Some options could not be loaded",
        description: `Failed to load ${failures.join(", ")}. Try reopening the modal.`,
        variant: "error",
      })
    })
  }, [open, toast])

  // Re-seed the form every time the modal opens. The modal stays mounted,
  // so useState initializers only run once — on first render, before the
  // workspace preset has loaded and before any stream is selected. Without
  // this, the preset never populates on a fresh app load, and edit-mode
  // state can bleed in from a previous open.
  useEffect(() => {
    if (!open) return
    resetForm()
    // Intentionally re-run only when `open` transitions, not on resetForm
    // identity changes — that would wipe the user's in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // When latency is ultraLow, DVR must be disabled
  useEffect(() => {
    if (latencyPreference === "ultraLow") {
      setEnableDvr(false)
    }
  }, [latencyPreference])

  const resetForm = useCallback(() => {
    const reset = stream ?? preset ?? null
    const resetScheduledStart = stream ? stream.scheduledStartTime : preset?.scheduledStartTime ?? null
    const resetThumbnailUrl = stream ? stream.thumbnailUrl ?? null : preset?.thumbnailUrl ?? null
    setTitle(reset?.title ?? "")
    setDescription(reset?.description ?? "")
    setPrivacyStatus(reset?.privacyStatus ?? "unlisted")
    setIsForKids(reset?.isForKids ?? false)
    setScheduledStartTime(
      resetScheduledStart ? formatUtcIsoForDateTimeInput(resetScheduledStart, browserTimeZone) : "",
    )
    setThumbnail(resetThumbnailUrl ? { type: "url", url: resetThumbnailUrl } : null)
    setThumbnailFileName(resetThumbnailUrl ? (resetThumbnailUrl.split("/").pop() || "Current thumbnail") : undefined)
    setThumbnailUrlInput("")
    setThumbnailMode("file")
    setCategoryId(reset?.categoryId ?? null)
    setTags(reset?.tags ?? [])
    setTagInput("")
    setPlaylistId(reset?.playlistId ?? null)
    setLatencyPreference(reset?.latencyPreference ?? "normal")
    setEnableDvr(reset?.enableDvr ?? true)
    setEnableEmbed(reset?.enableEmbed ?? true)
    setEnableAutoStart(reset?.enableAutoStart ?? false)
    setEnableAutoStop(reset?.enableAutoStop ?? true)
    setSavePreset(false)
  }, [browserTimeZone, stream, preset])

  function handleModalOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleFileSelect(file: File | null) {
    if (file) {
      setThumbnail({ type: "file", file })
      setThumbnailFileName(file.name)
    } else {
      setThumbnail(null)
      setThumbnailFileName(undefined)
    }
  }

  function handleThumbnailUrlConfirm() {
    const url = thumbnailUrlInput.trim()
    if (!url) return
    setThumbnail({ type: "url", url })
    setThumbnailFileName(url.split("/").pop() || "Image from URL")
  }

  function handleMediaSelect(mediaId: string) {
    const item = imageMedia.find((m) => m.id === mediaId)
    if (!item) return
    setThumbnail({ type: "url", url: item.url })
    setThumbnailFileName(item.name)
  }

  function clearThumbnail() {
    setThumbnail(null)
    setThumbnailFileName(undefined)
    setThumbnailUrlInput("")
  }

  function handleAddTag(value: string) {
    const tag = value.trim()
    if (!tag || tags.includes(tag)) return
    setTags((prev) => [...prev, tag])
    setTagInput("")
  }

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleTagInputBlur() {
    handleAddTag(tagInput)
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      handleAddTag(tagInput)
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        privacyStatus,
        isForKids,
        scheduledStartTime: scheduledStartTime ? parseDateTimeInputToUtcIso(scheduledStartTime, browserTimeZone) : null,
        categoryId,
        tags,
        latencyPreference,
        enableDvr,
        enableEmbed,
        enableAutoStart,
        enableAutoStop,
        playlistId,
        savePreset,
        thumbnail,
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal open={open} onOpenChange={handleModalOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="max-w-lg">
            <Modal.Header>
              <Label.md>{isEditing ? "Edit Stream" : "Create Stream"}</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4 max-h-[70vh] overflow-y-auto">
                <StreamBasicFields
                  title={title}
                  description={description}
                  scheduledStartTime={scheduledStartTime}
                  privacyStatus={privacyStatus}
                  isForKids={isForKids}
                  onTitleChange={setTitle}
                  onDescriptionChange={setDescription}
                  onScheduledStartChange={setScheduledStartTime}
                  onPrivacyChange={setPrivacyStatus}
                  onIsForKidsChange={setIsForKids}
                />

                {/* ─── Thumbnail ─── */}
                <StreamThumbnailField
                  thumbnail={thumbnail}
                  thumbnailFileName={thumbnailFileName}
                  thumbnailUrlInput={thumbnailUrlInput}
                  thumbnailMode={thumbnailMode}
                  imageMedia={imageMedia}
                  onModeChange={setThumbnailMode}
                  onFileSelect={handleFileSelect}
                  onUrlInputChange={setThumbnailUrlInput}
                  onUrlConfirm={handleThumbnailUrlConfirm}
                  onMediaSelect={handleMediaSelect}
                  onClear={clearThumbnail}
                />

                {/* ─── Remember settings (save workspace preset) ─── */}
                {!isEditing && (
                  <Checkbox
                    checked={savePreset}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSavePreset(e.target.checked)}
                  >
                    <div className="flex flex-col">
                      <Paragraph.sm>Remember these settings</Paragraph.sm>
                      <Paragraph.xs className="text-quaternary">
                        Saves every field on this form as defaults for the next stream you create.
                      </Paragraph.xs>
                    </div>
                  </Checkbox>
                )}

                {/* ─── Advanced Settings (Accordion) ─── */}
                <Accordion type="multiple">
                  <StreamOptionsSection
                    categoryId={categoryId}
                    categories={categories}
                    tags={tags}
                    tagInput={tagInput}
                    playlistId={playlistId}
                    playlists={playlists}
                    onCategoryChange={setCategoryId}
                    onTagInputChange={setTagInput}
                    onTagKeyDown={handleTagKeyDown}
                    onTagBlur={handleTagInputBlur}
                    onRemoveTag={handleRemoveTag}
                    onPlaylistChange={setPlaylistId}
                  />

                  <StreamAdvancedSection
                    latencyPreference={latencyPreference}
                    enableDvr={enableDvr}
                    enableEmbed={enableEmbed}
                    enableAutoStart={enableAutoStart}
                    enableAutoStop={enableAutoStop}
                    onLatencyChange={setLatencyPreference}
                    onDvrChange={setEnableDvr}
                    onEmbedChange={setEnableEmbed}
                    onAutoStartChange={setEnableAutoStart}
                    onAutoStopChange={setEnableAutoStop}
                  />
                </Accordion>
              </div>
            </Modal.Content>

            <Modal.Footer>
              <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
                {isSubmitting
                  ? isEditing ? "Updating..." : "Creating..."
                  : isEditing ? "Update Stream" : "Create Stream"}
              </Button>
              <Modal.Close>
                <Button variant="secondary">Cancel</Button>
              </Modal.Close>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
