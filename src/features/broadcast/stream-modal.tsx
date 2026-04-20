import { useCallback, useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import { Modal } from "@/components/overlays/modal"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { Checkbox } from "@/components/form/checkbox"
import { FileDropzone } from "@/components/form/file-dropzone"
import { Label, Paragraph } from "@/components/display/text"
import { Accordion } from "@/components/display/accordion"
import { SegmentedControl } from "@/components/controls/segmented-control"
import type { Stream, StreamPreset, StreamPrivacy, LatencyPreference, YouTubeCategory, YouTubePlaylist } from "@/types/broadcast/stream"
import type { MediaItem } from "@/types/broadcast/media-item"
import { streamPrivacyLabel, latencyPreferenceLabel, latencyPreferenceHint } from "@/types/broadcast/stream-constants"
import type { ThumbnailSource } from "@/data/mutate-streams"
import { fetchCategories, fetchPlaylists } from "@/data/fetch-streams"
import { fetchMedia } from "@/data/fetch-broadcast"
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from "@/utils/zoned-date-time"
import { ChevronDown, Image, Link, X } from "lucide-react"

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

  // Fetch categories, playlists, and media when modal opens
  useEffect(() => {
    if (!open) return
    fetchCategories().then(setCategories).catch(() => { })
    fetchPlaylists().then(setPlaylists).catch(() => { })
    fetchMedia().then(setMediaItems).catch(() => { })
  }, [open])

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
    <Modal.Root open={open} onOpenChange={handleModalOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="max-w-lg">
            <Modal.Header>
              <Label.md>{isEditing ? "Edit Stream" : "Create Stream"}</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4 max-h-[70vh] overflow-y-auto">
                {/* ─── Title ─── */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Title" required />
                  <Input
                    value={title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    placeholder="Stream title"
                  />
                </div>

                {/* ─── Description ─── */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Description" />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Stream description..."
                    rows={3}
                    className="w-full rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary placeholder:text-quaternary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                  />
                </div>

                {/* ─── Scheduled Start ─── */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Scheduled Start" />
                  <Input
                    type="datetime-local"
                    value={scheduledStartTime}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setScheduledStartTime(e.target.value)}
                  />
                  {!scheduledStartTime && (
                    <Paragraph.xs className="text-quaternary">
                      Leave empty to start immediately when going live.
                    </Paragraph.xs>
                  )}
                </div>

                {/* ─── Privacy ─── */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Privacy" />
                  <SegmentedControl.Root
                    fill
                    value={privacyStatus}
                    onValueChange={(v: string) => setPrivacyStatus(v as StreamPrivacy)}
                  >
                    {(Object.keys(streamPrivacyLabel) as StreamPrivacy[]).map((key) => (
                      <SegmentedControl.Item key={key} value={key}>
                        {streamPrivacyLabel[key]}
                      </SegmentedControl.Item>
                    ))}
                  </SegmentedControl.Root>
                </div>

                {/* ─── Made for kids ─── */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Made for kids" />
                  <SegmentedControl.Root
                    fill
                    value={isForKids ? "yes" : "no"}
                    onValueChange={(v: string) => setIsForKids(v === "yes")}
                  >
                    <SegmentedControl.Item value="no">No</SegmentedControl.Item>
                    <SegmentedControl.Item value="yes">Yes</SegmentedControl.Item>
                  </SegmentedControl.Root>
                </div>

                {/* ─── Thumbnail ─── */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Thumbnail" optional />

                  {thumbnail ? (
                    <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
                      {thumbnail.type === "url" && (
                        <img
                          src={thumbnail.url}
                          alt=""
                          className="size-8 rounded object-cover shrink-0"
                        />
                      )}
                      <Paragraph.sm className="text-secondary truncate flex-1">
                        {thumbnailFileName}
                      </Paragraph.sm>
                      <Button.Icon
                        variant="ghost"
                        icon={<X className="size-3.5" />}
                        onClick={clearThumbnail}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <SegmentedControl.Root
                        fill
                        value={thumbnailMode}
                        onValueChange={(v: string) => setThumbnailMode(v as "file" | "url" | "media")}
                      >
                        <SegmentedControl.Item value="file">Upload</SegmentedControl.Item>
                        <SegmentedControl.Item value="url">URL</SegmentedControl.Item>
                        <SegmentedControl.Item value="media" icon={<Image className="size-3.5" />}>Media</SegmentedControl.Item>
                      </SegmentedControl.Root>

                      {thumbnailMode === "file" && (
                        <FileDropzone
                          accept="image/jpeg,image/png"
                          onFileSelect={handleFileSelect}
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
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setThumbnailUrlInput(e.target.value)
                            }
                            placeholder="https://example.com/thumbnail.jpg"
                            className="flex-1"
                          />
                          <Button
                            variant="secondary"
                            onClick={handleThumbnailUrlConfirm}
                            disabled={!thumbnailUrlInput.trim()}
                          >
                            Set
                          </Button>
                        </div>
                      )}

                      {thumbnailMode === "media" && (
                        imageMedia.length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => handleMediaSelect(e.target.value)}
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                          >
                            <option value="" disabled>
                              Select an image from media library...
                            </option>
                            {imageMedia.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
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
                <Accordion.Root type="multiple">
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
                          <select
                            value={categoryId ?? ""}
                            onChange={(e) => setCategoryId(e.target.value || null)}
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                          >
                            <option value="">None</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.title}
                              </option>
                            ))}
                          </select>
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
                                <button
                                  type="button"
                                  className="text-quaternary hover:text-primary"
                                  onClick={() => handleRemoveTag(tag)}
                                >
                                  <X className="size-3" />
                                </button>
                              </span>
                            ))}
                            <input
                              value={tagInput}
                              onChange={(e) => setTagInput(e.target.value)}
                              onKeyDown={handleTagKeyDown}
                              onBlur={() => handleAddTag(tagInput)}
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
                          <select
                            value={playlistId ?? ""}
                            onChange={(e) => setPlaylistId(e.target.value || null)}
                            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                          >
                            <option value="">None</option>
                            {playlists.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.title} ({pl.itemCount} items)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>

                  <Accordion.Item value="advanced">
                    <Accordion.Trigger className="flex items-center gap-2 py-2 text-left">
                      <Label.sm className="flex-1">Advanced Settings</Label.sm>
                      <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content>
                      <div className="flex flex-col gap-4 pb-2 pt-1">
                        {/* Latency */}
                        <div className="flex flex-col gap-1.5">
                          <FormLabel label="Latency" />
                          <SegmentedControl.Root
                            fill
                            value={latencyPreference}
                            onValueChange={(v: string) => setLatencyPreference(v as LatencyPreference)}
                          >
                            {(Object.keys(latencyPreferenceLabel) as LatencyPreference[]).map((key) => (
                              <SegmentedControl.Item key={key} value={key}>
                                {latencyPreferenceLabel[key]}
                              </SegmentedControl.Item>
                            ))}
                          </SegmentedControl.Root>
                          <Paragraph.xs className="text-quaternary">
                            {latencyPreferenceHint[latencyPreference]}
                          </Paragraph.xs>
                        </div>

                        {/* DVR */}
                        <Checkbox checked={enableDvr} disabled={latencyPreference === "ultraLow"} onChange={(e: ChangeEvent<HTMLInputElement>) => setEnableDvr(e.target.checked)} >
                          <div className="flex flex-col">
                            <Paragraph.sm>Enable DVR</Paragraph.sm>
                            <Paragraph.xs className="text-quaternary">
                              {latencyPreference === "ultraLow"
                                ? "DVR is not available with Ultra Low latency."
                                : "Allows viewers to pause and rewind during the live stream."}
                            </Paragraph.xs>
                          </div>
                        </Checkbox>

                        {/* Embedding */}
                        <Checkbox checked={enableEmbed} onChange={(e: ChangeEvent<HTMLInputElement>) => setEnableEmbed(e.target.checked)} >
                          <div className="flex flex-col">
                            <Paragraph.sm>Allow embedding</Paragraph.sm>
                            <Paragraph.xs className="text-quaternary">
                              Let others embed this stream on their websites.
                            </Paragraph.xs>
                          </div>
                        </Checkbox>

                        {/* Auto-start */}
                        <Checkbox checked={enableAutoStart} onChange={(e: ChangeEvent<HTMLInputElement>) => setEnableAutoStart(e.target.checked)} >
                          <div className="flex flex-col">
                            <Paragraph.sm>Auto-start</Paragraph.sm>
                            <Paragraph.xs className="text-quaternary">
                              Automatically start the broadcast when the encoder begins streaming.
                            </Paragraph.xs>
                          </div>
                        </Checkbox>

                        {/* Auto-stop */}
                        <Checkbox checked={enableAutoStop} onChange={(e: ChangeEvent<HTMLInputElement>) => setEnableAutoStop(e.target.checked)} >
                          <div className="flex flex-col">
                            <Paragraph.sm>Auto-stop</Paragraph.sm>
                            <Paragraph.xs className="text-quaternary">
                              Automatically end the broadcast when the encoder stops streaming.
                            </Paragraph.xs>
                          </div>
                        </Checkbox>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion.Root>
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
    </Modal.Root>
  )
}
