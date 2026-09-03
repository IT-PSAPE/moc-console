import { Button as BaseButton } from "@base-ui/react/button"
import { Input as BaseInput } from "@base-ui/react/input"
import { useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"
import { Check, Upload } from "lucide-react"
import { Paragraph } from "@moc/ui/components/display/text"
import { cn } from "@moc/utils/cn"

type FileDropzoneProps = {
  accept?: string
  className?: string
  fileName?: string
  fileNames?: string[]
  multiple?: boolean
  onFileSelect: (file: File | null) => void
  onFilesSelect?: (files: File[]) => void
  placeholder?: string
  selectedHint?: string
}

export function FileDropzone({ accept, className, fileName, fileNames, multiple = false, onFileSelect, onFilesSelect, placeholder = "Drag and drop a file here, or click to browse.", selectedHint = "Drop a new file or click to replace it." }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedFileNames = fileNames?.length ? fileNames : fileName ? [fileName] : []
  const hasSelection = selectedFileNames.length > 0
  const displayName = hasSelection
    ? selectedFileNames.length === 1
      ? selectedFileNames[0]
      : `${selectedFileNames.length} files selected`
    : null

  function handleTriggerClick() {
    inputRef.current?.click()
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? [])
    onFilesSelect?.(nextFiles)
    onFileSelect(nextFiles[0] ?? null)
    event.target.value = ""
  }

  function handleDragEnter(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
    if (!isDragging) setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()

    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return

    setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    const nextFiles = Array.from(event.dataTransfer.files ?? [])
    onFilesSelect?.(nextFiles)
    onFileSelect(nextFiles[0] ?? null)
  }

  return (
    <>
      <BaseInput ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={handleInputChange} />
      <BaseButton
        type="button"
        className={cn(
          "flex flex-col min-h-24 w-full items-center gap-3 rounded-lg border border-dashed bg-primary px-4 py-3 text-left transition-colors",
          "border-secondary hover:border-brand hover:bg-primary_hover",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
          isDragging && "border-brand bg-primary_hover ring-3 ring-border-brand/10",
          className,
        )}
        onClick={handleTriggerClick}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-tertiary", hasSelection && "text-utility-green-700")}>
          {hasSelection ? <Check className="size-4" /> : <Upload className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Paragraph.sm className={cn("text-secondary", !hasSelection && "text-tertiary")}>
            {displayName ?? placeholder}
          </Paragraph.sm>
          <Paragraph.xs className="text-quaternary">
            {hasSelection ? selectedHint : "Supports image, audio, and video files."}
          </Paragraph.xs>
        </span>
      </BaseButton>
    </>
  )
}
