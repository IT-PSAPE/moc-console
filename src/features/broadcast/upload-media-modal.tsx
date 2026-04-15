import { useCallback, useMemo, useState } from "react"
import type { ChangeEvent } from "react"
import { Modal } from "@/components/overlays/modal"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { FormLabel } from "@/components/form/form-label"
import { Label, Paragraph } from "@/components/display/text"
import type { MediaItem } from "@/types/broadcast/media-item"
import { FileDropzone } from "@/components/form/file-dropzone"
import { SegmentedControl } from "@/components/controls/segmented-control"
import { mediaTypeLabel } from "@/types/broadcast/constants"
import { getDefaultMediaDetails, inferMediaTypeFromSource } from "@/utils/media-source"
import { Link } from "lucide-react"

type UploadMediaModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (item: MediaItem) => Promise<void> | void
}

type SourceMode = "url" | "upload"

export function UploadMediaModal({ open, onOpenChange, onSubmit }: UploadMediaModalProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>("url")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const resetForm = useCallback(() => {
    setSourceMode("url")
    setName("")
    setUrl("")
    setFile(null)
  }, [])

  const inferredMediaType = useMemo(() => {
    return inferMediaTypeFromSource({
      file: sourceMode === "upload" ? file : null,
      url: sourceMode === "url" ? url : null,
    })
  }, [file, sourceMode, url])

  const hasSourceValue = sourceMode === "url" ? Boolean(url.trim()) : Boolean(file)
  const canSubmit = Boolean(name.trim()) && hasSourceValue && Boolean(inferredMediaType)

  function handleModalOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen)

    if (!nextOpen) resetForm()
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value)
  }

  function handleSourceChange(value: string) {
    setSourceMode(value as SourceMode)
  }

  function handleFileSelect(nextFile: File | null) {
    setFile(nextFile)
  }

  async function handleSubmit() {
    if (!inferredMediaType) return

    const trimmedName = name.trim()
    const sourceUrl = sourceMode === "url" ? url.trim() : `/uploads/${file?.name ?? ""}`
    const mediaDetails = getDefaultMediaDetails(inferredMediaType)
    const newItem: MediaItem = {
      id: crypto.randomUUID(),
      name: trimmedName || "Untitled",
      type: inferredMediaType,
      url: sourceUrl,
      thumbnail: mediaDetails.thumbnail,
      duration: mediaDetails.duration,
      createdAt: new Date().toISOString().split("T")[0],
    }
    await onSubmit(newItem)
    resetForm()
    onOpenChange(false)
  }

  function renderSourceStatus() {
    if (!hasSourceValue) return null

    if (inferredMediaType) {
      return (
        <Paragraph.xs className="text-quaternary">
          Detected as {mediaTypeLabel[inferredMediaType].toLowerCase()} media.
        </Paragraph.xs>
      )
    }

    return (
      <Paragraph.xs className="text-utility-red-700">
        {sourceMode === "url" ? "We couldn't determine the media type from this URL." : "This file type isn't supported."}
      </Paragraph.xs>
    )
  }

  return (
    <Modal.Root open={open} onOpenChange={handleModalOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="max-w-md">
            <Modal.Header>
              <Label.md>Add Media</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Name" />
                  <Input
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Media item name"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Source" />
                  <SegmentedControl.Root fill value={sourceMode} onValueChange={handleSourceChange}>
                    <SegmentedControl.Item value="url">URL</SegmentedControl.Item>
                    <SegmentedControl.Item value="upload">Upload</SegmentedControl.Item>
                  </SegmentedControl.Root>
                </div>

                <div className="flex flex-col gap-1.5">
                  <FormLabel label={sourceMode === "url" ? "URL" : "File"} />
                  {sourceMode === "url" ? (
                    <Input
                      icon={<Link />}
                      value={url}
                      onChange={handleUrlChange}
                      placeholder="https://example.com/media.mp4"
                    />
                  ) : (
                    <FileDropzone
                      accept="image/*,audio/*,video/*"
                      fileName={file?.name}
                      onFileSelect={handleFileSelect}
                    />
                  )}
                  {renderSourceStatus()}
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
