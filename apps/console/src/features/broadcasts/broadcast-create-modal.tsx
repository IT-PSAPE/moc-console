import { BROADCAST_FILE_ACCEPT, BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
import { FileDropzone } from "@moc/ui/components/form/file-dropzone"
import { Input } from "@moc/ui/components/form/input"
import { Radio, RadioGroup } from "@moc/ui/components/form/radio"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Toggle } from "@moc/ui/components/form/toggle"
import { Modal } from "@moc/ui/components/overlays/modal"
import type { ChangeEvent } from "react"

type BroadcastCreateModalProps = {
  description: string
  files: File[]
  isOpen: boolean
  isPublished: boolean
  isSubmitting: boolean
  kind: BroadcastKind
  loopEnabled: boolean
  preloadCount: number
  title: string
  onDescriptionChange: (value: string) => void
  onFilesChange: (files: File[]) => void
  onIsPublishedChange: (value: boolean) => void
  onKindChange: (value: BroadcastKind) => void
  onLoopEnabledChange: (value: boolean) => void
  onOpenChange: (open: boolean) => void
  onPreloadCountChange: (value: number) => void
  onSubmit: () => void
  onTitleChange: (value: string) => void
}

export function BroadcastCreateModal({
  description,
  files,
  isOpen,
  isPublished,
  isSubmitting,
  kind,
  loopEnabled,
  preloadCount,
  title,
  onDescriptionChange,
  onFilesChange,
  onIsPublishedChange,
  onKindChange,
  onLoopEnabledChange,
  onOpenChange,
  onPreloadCountChange,
  onSubmit,
  onTitleChange,
}: BroadcastCreateModalProps) {
  const fileNames = files.map((file) => file.name)

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    onTitleChange(event.target.value)
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onDescriptionChange(event.target.value)
  }

  function handleKindChange(value: string) {
    onKindChange(value as BroadcastKind)
  }

  function handlePreloadCountChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value)
    onPreloadCountChange(Number.isFinite(nextValue) ? nextValue : 1)
  }

  function handleFilesChange(nextFiles: File[]) {
    onFilesChange(nextFiles)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  function ignoreSingleFileSelection() {}

  return (
    <Modal open={isOpen} onOpenChange={onOpenChange} closeOnBackdropClick={!isSubmitting} closeOnEscape={!isSubmitting}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:!max-w-2xl">
            <Modal.Header>
              <Label.md>New broadcast</Label.md>
            </Modal.Header>
            <Modal.Content className="flex flex-col gap-4">
              <FormField label="Title" required>
                <Input aria-label="Broadcast title" name="broadcast-title" autoComplete="off" value={title} onChange={handleTitleChange} />
              </FormField>

              <FormField label="Description" optional>
                <TextArea aria-label="Broadcast description" name="broadcast-description" value={description} onChange={handleDescriptionChange} />
              </FormField>

              <FormField label="Type" required>
                <RadioGroup name="broadcast-kind" value={kind} onValueChange={handleKindChange} className="flex flex-col gap-2 md:flex-row md:gap-4">
                  <Radio value="audio">{BROADCAST_KIND_LABELS.audio}</Radio>
                  <Radio value="video">{BROADCAST_KIND_LABELS.video}</Radio>
                </RadioGroup>
              </FormField>

              <FormField label="Files" required>
                <div className="flex flex-col gap-2">
                  <FileDropzone
                    accept={BROADCAST_FILE_ACCEPT[kind]}
                    multiple
                    fileNames={fileNames}
                    onFileSelect={ignoreSingleFileSelection}
                    onFilesSelect={handleFilesChange}
                    placeholder={`Drop ${BROADCAST_KIND_LABELS[kind].toLowerCase()} files or click to browse.`}
                    selectedHint="Drop a new set of files or click to replace the current sequence."
                  />
                  <Paragraph.xs className="text-quaternary">
                    Files play in the order you select them.
                  </Paragraph.xs>
                </div>
              </FormField>

              <FormField label="Preload items" required>
                <Input
                  aria-label="Broadcast preload count"
                  name="broadcast-preload-count"
                  type="number"
                  min={1}
                  max={3}
                  value={String(preloadCount)}
                  onChange={handlePreloadCountChange}
                />
              </FormField>

              <div className="flex flex-col gap-3">
                <Toggle checked={loopEnabled} onChange={onLoopEnabledChange}>
                  <Paragraph.sm>Loop continuously</Paragraph.sm>
                </Toggle>
                <Toggle checked={isPublished} onChange={onIsPublishedChange}>
                  <Paragraph.sm>Make this broadcast available to the public player</Paragraph.sm>
                </Toggle>
              </div>
            </Modal.Content>
            <Modal.Footer className="justify-end">
              <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create broadcast"}
              </Button>
            </Modal.Footer>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
