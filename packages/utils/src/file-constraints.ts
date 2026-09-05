// Shared file gate for every dropzone. The `accept` attribute is only a hint to
// the file picker — it is not enforced, and drag-and-drop bypasses it entirely —
// so the same rules are applied again here against what the user actually chose.

export type FileRejection = {
  file: File
  reason: string
}

export type FileConstraints = {
  accept?: string
  maxSizeBytes?: number
  minSizeBytes?: number
}

export type FilePartition = {
  acceptedFiles: File[]
  rejections: FileRejection[]
}

// macOS writes an AppleDouble sidecar next to every real file on a non-HFS
// volume (USB sticks, zips, SMB shares). It copies the original name — and so
// the original extension and mime type — but holds only resource-fork
// metadata, so it passes every check except this one. No dropzone in the app
// ever wants one, which is why the rule lives here rather than per-feature.
export const APPLE_DOUBLE_REASON = "macOS sidecar file, not real media. Add the original file without the leading “._”."

export function isAppleDoubleName(fileName: string): boolean {
  return fileName.startsWith("._")
}

function formatScaled(value: number, unit: string): string {
  // 50 MB rather than 50.0 MB, but 1.5 MB keeps its fraction.
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return formatScaled(bytes / (1024 * 1024), "MB")
  return formatScaled(bytes / (1024 * 1024 * 1024), "GB")
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".")
  return dotIndex <= 0 ? "" : fileName.slice(dotIndex).toLowerCase()
}

export function matchesAccept(file: File, accept?: string): boolean {
  const patterns = (accept ?? "").split(",").map((pattern) => pattern.trim().toLowerCase()).filter(Boolean)
  if (patterns.length === 0) return true

  const fileType = file.type.toLowerCase()
  const extension = getFileExtension(file.name)

  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return pattern === extension
    if (pattern.endsWith("/*")) return fileType.startsWith(pattern.slice(0, -1))
    return pattern === fileType
  })
}

export function getFileRejectionReason(file: File, { accept, maxSizeBytes, minSizeBytes }: FileConstraints): string | null {
  // Checked before type and size so the sidecar gets its own explanation
  // rather than the generic "too small" one.
  if (isAppleDoubleName(file.name)) {
    return APPLE_DOUBLE_REASON
  }

  if (!matchesAccept(file, accept)) {
    return "Unsupported file type."
  }

  if (minSizeBytes !== undefined && file.size < minSizeBytes) {
    return `Only ${formatFileSize(file.size)} — too small to be a real file.`
  }

  if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
    return `${formatFileSize(file.size)} is over the ${formatFileSize(maxSizeBytes)} limit.`
  }

  return null
}

// Every file is checked; one bad file never discards the rest of the batch.
export function partitionFiles(files: File[], constraints: FileConstraints): FilePartition {
  return files.reduce<FilePartition>((partition, file) => {
    const reason = getFileRejectionReason(file, constraints)

    if (reason) {
      partition.rejections.push({ file, reason })
    } else {
      partition.acceptedFiles.push(file)
    }

    return partition
  }, { acceptedFiles: [], rejections: [] })
}
