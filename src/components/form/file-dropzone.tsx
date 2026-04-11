import { useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"
import { Check, Upload } from "lucide-react"
import { Paragraph } from "@/components/display/text"
import { cn } from "@/utils/cn"

type FileDropzoneProps = {
  accept?: string
  className?: string
  fileName?: string
  onFileSelect: (file: File | null) => void
  placeholder?: string
  selectedHint?: string
}

export function FileDropzone({ accept, className, fileName, onFileSelect, placeholder = "Drag and drop a file here, or click to browse.", selectedHint = "Drop a new file or click to replace it." }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleTriggerClick() {
    inputRef.current?.click()
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    onFileSelect(nextFile)
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
    const nextFile = event.dataTransfer.files?.[0] ?? null
    onFileSelect(nextFile)
  }

  return (
    <>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleInputChange} />
      <button
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
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-tertiary", fileName && "text-utility-green-700")}>
          {fileName ? <Check className="size-4" /> : <Upload className="size-4" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Paragraph.sm className={cn("text-secondary", !fileName && "text-tertiary")}>
            {fileName ?? placeholder}
          </Paragraph.sm>
          <Paragraph.xs className="text-quaternary">
            {fileName ? selectedHint : "Supports image, audio, and video files."}
          </Paragraph.xs>
        </span>
      </button>
    </>
  )
}
