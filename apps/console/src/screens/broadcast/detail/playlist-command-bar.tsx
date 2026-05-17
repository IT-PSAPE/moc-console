import { useCallback, useRef } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Label } from "@moc/ui/components/display/text"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { playlistStatusLabel } from "@moc/types/broadcast"
import type { Playlist, PlaylistStatus } from "@moc/types/broadcast"
import { ChevronDown, ImagePlus, PanelRight, Sliders, Upload, X } from "lucide-react"

const allStatuses: PlaylistStatus[] = ["draft", "published"]

type PlaylistCommandBarProps = {
  playlist: Playlist
  inspectorOpen: boolean
  sourceOpen: boolean
  onToggleSource: () => void
  onNameSave: (name: string) => void
  onStatusChange: (status: PlaylistStatus) => void
  onDescriptionChange: (value: string) => void
  onDescriptionBlur: () => void
  onThumbnailUrlChange: (value: string) => void
  onThumbnailBlur: () => void
  onThumbnailUpload: (file: File | undefined) => void
  onThumbnailRemove: () => void
  onToggleInspector: () => void
}

export function PlaylistCommandBar({ playlist, inspectorOpen, sourceOpen, onToggleSource, onNameSave, onStatusChange, onDescriptionChange, onDescriptionBlur, onThumbnailUrlChange, onThumbnailBlur, onThumbnailUpload, onThumbnailRemove, onToggleInspector }: PlaylistCommandBarProps) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onThumbnailUpload(e.target.files?.[0])
    e.target.value = ""
  }, [onThumbnailUpload])

  const handleNameBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onNameSave(e.target.value)
  }, [onNameSave])

  const handleStatusValueChange = useCallback((v: string) => {
    onStatusChange(v as PlaylistStatus)
  }, [onStatusChange])

  const handleDescriptionInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDescriptionChange(e.target.value)
  }, [onDescriptionChange])

  const handleThumbnailInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onThumbnailUrlChange(e.target.value)
  }, [onThumbnailUrlChange])

  const handleUploadClick = useCallback(() => {
    thumbnailInputRef.current?.click()
  }, [])

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-secondary bg-secondary_alt px-3">
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dropdown placement="bottom">
        <Dropdown.Trigger>
          <div className="flex shrink-0 items-center gap-2">
            <span className="relative size-8 shrink-0 overflow-hidden rounded-md">
              {playlist.thumbnailUrl
                ? <img src={playlist.thumbnailUrl} alt="" className="size-full object-cover" />
                : <span className="grid size-full place-items-center bg-secondary text-quaternary"><ImagePlus className="size-4" /></span>}
            </span>
            <span className="flex min-w-0 flex-col items-start">
              <Label.sm className="max-w-[260px] truncate text-primary">{playlist.name || "Untitled"}</Label.sm>
            </span>
            <ChevronDown className="size-3.5 text-quaternary" />
          </div>
        </Dropdown.Trigger>
        <Dropdown.Panel className="!w-[320px] !p-0">
          <div className="space-y-4 p-4">
            <Input key={playlist.id} defaultValue={playlist.name} placeholder="Untitled" onBlur={handleNameBlur} />

            <SegmentedControl value={playlist.status} onValueChange={handleStatusValueChange} fill>
              {allStatuses.map((s) => (
                <SegmentedControl.Item key={s} value={s}>{playlistStatusLabel[s]}</SegmentedControl.Item>
              ))}
            </SegmentedControl>

            <TextArea
              style="outline"
              rows={3}
              value={playlist.description}
              onChange={handleDescriptionInput}
              onBlur={onDescriptionBlur}
              placeholder="Describe this playlist…"
            />

            <div className="space-y-1.5">
              <Label.xs className="text-tertiary">Thumbnail</Label.xs>
              <div className="flex items-center gap-2">
                <span className="size-10 shrink-0 overflow-hidden rounded-md ring-1 ring-secondary">
                  {playlist.thumbnailUrl
                    ? <img src={playlist.thumbnailUrl} alt="" className="size-full object-cover" />
                    : <span className="grid size-full place-items-center bg-secondary text-quaternary"><ImagePlus className="size-4" /></span>}
                </span>
                <Input
                  value={playlist.thumbnailUrl ?? ""}
                  onChange={handleThumbnailInput}
                  onBlur={onThumbnailBlur}
                  placeholder="Image URL…"
                  className="min-w-0 flex-1"
                />
                <Button.Icon variant="secondary" icon={<Upload />} onClick={handleUploadClick} title="Upload" className="shrink-0" />
                {playlist.thumbnailUrl && (
                  <Button.Icon variant="ghost" icon={<X />} onClick={onThumbnailRemove} title="Remove" className="shrink-0" />
                )}
              </div>
            </div>
          </div>
        </Dropdown.Panel>
      </Dropdown>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          variant={sourceOpen ? "secondary" : "ghost"}
          icon={<PanelRight />}
          onClick={onToggleSource}
        >
          Source
        </Button>
        <Button
          variant={inspectorOpen ? "secondary" : "ghost"}
          icon={<Sliders />}
          onClick={onToggleInspector}
        >
          Settings
        </Button>
      </div>
    </header>
  )
}
