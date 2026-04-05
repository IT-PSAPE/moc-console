import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Drawer } from "@/components/overlays/drawer"
import { Dropdown } from "@/components/overlays/dropdown"
import { Accordion } from "@/components/display/accordion"
import { Button } from "@/components/controls/button"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Divider } from "@/components/display/divider"
import { MetaRow } from "@/components/display/meta-row"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { playlistStatusColor, playlistStatusLabel, mediaTypeColor, mediaTypeLabel } from "@/types/broadcast/constants"
import type { Playlist } from "@/types/broadcast/broadcast"
import type { PlaylistStatus } from "@/types/broadcast/broadcast-status"
import { routes } from "@/screens/console-routes"
import { ChevronDown, MoreHorizontal, Trash2, ToggleLeft, Maximize2, X, Loader, FileText, ListMusic } from "lucide-react"

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

type PlaylistDetailDrawerProps = {
  playlist: Playlist | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updated: Playlist) => void
  onDelete?: (id: string) => void
  onStatusChange?: (id: string, status: PlaylistStatus) => void
}

export function PlaylistDetailDrawer({ playlist, open, onOpenChange, onSave, onDelete, onStatusChange }: PlaylistDetailDrawerProps) {
  const navigate = useNavigate()
  const { state: { media } } = useBroadcast()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (playlist) {
      setName(playlist.name)
      setDescription(playlist.description)
    }
  }, [playlist])

  if (!playlist) return null

  const isDirty = name !== playlist.name || description !== playlist.description

  function handleClose() {
    onOpenChange(false)
  }

  function handleSave() {
    onSave({ ...playlist!, name, description })
    onOpenChange(false)
  }

  function handleOpenFullPage() {
    onOpenChange(false)
    navigate(`/${routes.broadcastPlaylistDetail.replace(":id", playlist!.id)}`)
  }

  const toggleStatus: PlaylistStatus = playlist.status === "active" ? "draft" : "active"

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Panel className="!max-w-lg">
          <Drawer.Header className="flex items-center gap-1">
            <Button variant="ghost" icon={<X />} iconOnly onClick={handleClose} />
            <Button variant="ghost" icon={<Maximize2 />} iconOnly onClick={handleOpenFullPage} />
            <div className="flex-1" />
            <Dropdown.Root placement="bottom">
              <Dropdown.Trigger>
                <Button variant="ghost" icon={<MoreHorizontal />} iconOnly />
              </Dropdown.Trigger>
              <Dropdown.Panel>
                <Dropdown.Item
                  onSelect={() => {
                    onStatusChange?.(playlist.id, toggleStatus)
                    onOpenChange(false)
                  }}
                >
                  <ToggleLeft className="size-4" />
                  Set to {playlistStatusLabel[toggleStatus]}
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item
                  onSelect={() => {
                    onDelete?.(playlist.id)
                    onOpenChange(false)
                  }}
                >
                  <Trash2 className="size-4 text-error" />
                  <span className="text-error">Delete</span>
                </Dropdown.Item>
              </Dropdown.Panel>
            </Dropdown.Root>
          </Drawer.Header>

          <Drawer.Content className="py-4">
            <div className="px-4 pb-4">
              <Title.h6>{name || "Untitled"}</Title.h6>
            </div>

            <div className="px-4 space-y-3">
              <MetaRow icon={<Loader />} label="Status">
                <Badge label={playlistStatusLabel[playlist.status]} color={playlistStatusColor[playlist.status]} />
              </MetaRow>

              <MetaRow icon={<FileText />} label="Name">
                <input
                  className="all-unset w-full text-xs text-primary placeholder:text-quaternary"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Playlist name"
                />
              </MetaRow>

              <MetaRow icon={<FileText />} label="Description">
                <textarea
                  className="all-unset w-full text-xs text-primary placeholder:text-quaternary resize-none"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this playlist..."
                />
              </MetaRow>
            </div>

            <Divider className="px-4 py-6" />

            <div className="px-4">
              <div className="flex items-center gap-2 pb-3">
                <ListMusic className="size-4 text-tertiary" />
                <Label.md>Cues{playlist.cues.length > 0 && ` (${playlist.cues.length})`}</Label.md>
              </div>

              {playlist.cues.length > 0 ? (
                <Accordion.Root type="multiple">
                  {playlist.cues.map((cue) => {
                    const mediaItem = media.find((m) => m.id === cue.mediaItemId)
                    const duration = cue.durationOverride ?? mediaItem?.duration

                    return (
                      <Accordion.Item key={cue.id} value={cue.id} className="border-b border-secondary last:border-b-0">
                        <Accordion.Trigger className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2">
                            <span className="size-5 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                              <Label.xs>{cue.order}</Label.xs>
                            </span>
                            <Label.sm className="truncate">{cue.mediaItemName}</Label.sm>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge label={mediaTypeLabel[cue.mediaItemType]} color={mediaTypeColor[cue.mediaItemType]} />
                            <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
                          </div>
                        </Accordion.Trigger>
                        <Accordion.Content>
                          <div className="pb-3 space-y-1.5">
                            {mediaItem?.url && (
                              <div className="flex items-center gap-2">
                                <Paragraph.xs className="text-quaternary shrink-0">URL:</Paragraph.xs>
                                <Paragraph.xs className="truncate">{mediaItem.url}</Paragraph.xs>
                              </div>
                            )}
                            {duration != null && (
                              <div className="flex items-center gap-2">
                                <Paragraph.xs className="text-quaternary shrink-0">Duration:</Paragraph.xs>
                                <Paragraph.xs>
                                  {formatDuration(duration)}
                                  {cue.durationOverride != null && " (override)"}
                                </Paragraph.xs>
                              </div>
                            )}
                            {cue.mediaItemType === "slide" && mediaItem?.slides && (
                              <div className="flex items-center gap-2">
                                <Paragraph.xs className="text-quaternary shrink-0">Slides:</Paragraph.xs>
                                <Paragraph.xs>{mediaItem.slides.length} slide{mediaItem.slides.length !== 1 ? "s" : ""}</Paragraph.xs>
                              </div>
                            )}
                            {cue.mediaItemType === "slide" && mediaItem?.audioUrl && (
                              <div className="flex items-center gap-2">
                                <Paragraph.xs className="text-quaternary shrink-0">Audio:</Paragraph.xs>
                                <Paragraph.xs className="truncate">{mediaItem.audioUrl}</Paragraph.xs>
                              </div>
                            )}
                            {!mediaItem && (
                              <Paragraph.xs className="text-quaternary">Media item not found</Paragraph.xs>
                            )}
                          </div>
                        </Accordion.Content>
                      </Accordion.Item>
                    )
                  })}
                </Accordion.Root>
              ) : (
                <Paragraph.sm className="text-quaternary">No cues added yet.</Paragraph.sm>
              )}
            </div>
          </Drawer.Content>

          {isDirty && (
            <Drawer.Footer className="justify-end">
              <Button variant="ghost" onClick={() => { setName(playlist.name); setDescription(playlist.description) }}>Discard</Button>
              <Button onClick={handleSave}>Save</Button>
            </Drawer.Footer>
          )}
        </Drawer.Panel>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
