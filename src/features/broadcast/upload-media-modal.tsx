import { useCallback, useRef, useState } from "react"
import { Modal } from "@/components/overlays/modal"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { Label, Paragraph } from "@/components/display/text"
import type { MediaType } from "@/types/broadcast/media-type"
import type { MediaItem } from "@/types/broadcast/media-item"
import { Image, Music, Video, Upload, Link, Check } from "lucide-react"

type UploadMediaModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (item: MediaItem) => void
}

const MEDIA_TYPES: { value: MediaType; label: string; icon: React.ReactNode }[] = [
  { value: "image", label: "Image", icon: <Image /> },
  { value: "video", label: "Video", icon: <Video /> },
  { value: "audio", label: "Audio", icon: <Music /> },
]

type SourceMode = "url" | "upload"

export function UploadMediaModal({ open, onOpenChange, onSubmit }: UploadMediaModalProps) {
  const [mediaType, setMediaType] = useState<MediaType>("image")
  const [sourceMode, setSourceMode] = useState<SourceMode>("url")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setMediaType("image")
    setSourceMode("url")
    setName("")
    setUrl("")
    setFileName("")
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      if (!name) {
        // Auto-fill name from file name (without extension)
        setName(file.name.replace(/\.[^.]+$/, ""))
      }
    }
  }

  function handleSubmit() {
    const newItem: MediaItem = {
      id: `media-new-${Date.now()}`,
      name: name || "Untitled",
      type: mediaType,
      url: sourceMode === "url" ? url : `/uploads/${fileName}`,
      thumbnail: null,
      duration: mediaType === "image" ? null : 0,
      createdAt: new Date().toISOString().split("T")[0],
      slides: null,
      audioUrl: null,
    }
    onSubmit(newItem)
    resetForm()
    onOpenChange(false)
  }

  const canSubmit = name.trim() && (sourceMode === "url" ? url.trim() : fileName)

  return (
    <Modal.Root open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) resetForm() }}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="max-w-md">
            <Modal.Header>
              <Label.md>Add Media</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                {/* Media type selection */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Type" />
                  <div className="grid grid-cols-3 gap-2">
                    {MEDIA_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                          mediaType === t.value
                            ? "border-brand bg-brand_secondary"
                            : "border-secondary hover:bg-primary_hover"
                        }`}
                        onClick={() => setMediaType(t.value)}
                      >
                        <span className={`*:size-5 ${mediaType === t.value ? "text-brand" : "text-tertiary"}`}>
                          {t.icon}
                        </span>
                        <Label.xs className={mediaType === t.value ? "text-brand" : ""}>{t.label}</Label.xs>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Source mode toggle */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Source" />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border cursor-pointer transition-colors ${
                        sourceMode === "url"
                          ? "border-brand bg-brand_secondary"
                          : "border-secondary hover:bg-primary_hover"
                      }`}
                      onClick={() => setSourceMode("url")}
                    >
                      <Link className={`size-4 ${sourceMode === "url" ? "text-brand" : "text-tertiary"}`} />
                      <Label.xs className={sourceMode === "url" ? "text-brand" : ""}>URL</Label.xs>
                    </button>
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border cursor-pointer transition-colors ${
                        sourceMode === "upload"
                          ? "border-brand bg-brand_secondary"
                          : "border-secondary hover:bg-primary_hover"
                      }`}
                      onClick={() => setSourceMode("upload")}
                    >
                      <Upload className={`size-4 ${sourceMode === "upload" ? "text-brand" : "text-tertiary"}`} />
                      <Label.xs className={sourceMode === "upload" ? "text-brand" : ""}>Upload</Label.xs>
                    </button>
                  </div>
                </div>

                {/* URL or File input */}
                {sourceMode === "url" ? (
                  <div className="flex flex-col gap-1.5">
                    <FormLabel label="URL" />
                    <Input
                      icon={<Link />}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/media.mp4"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <FormLabel label="File" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={
                        mediaType === "image" ? "image/*" :
                        mediaType === "video" ? "video/*" :
                        "audio/*"
                      }
                      onChange={handleFileChange}
                    />
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-secondary hover:border-brand hover:bg-primary_hover cursor-pointer transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {fileName ? (
                        <>
                          <Check className="size-4 text-utility-green-700" />
                          <Paragraph.sm className="truncate flex-1 text-left">{fileName}</Paragraph.sm>
                        </>
                      ) : (
                        <>
                          <Upload className="size-4 text-tertiary" />
                          <Paragraph.sm className="text-tertiary">Choose a file...</Paragraph.sm>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Name" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Media item name"
                  />
                </div>
              </div>
            </Modal.Content>

            <Modal.Footer>
              <Button variant="primary" disabled={!canSubmit} onClick={handleSubmit}>
                Add Media
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
