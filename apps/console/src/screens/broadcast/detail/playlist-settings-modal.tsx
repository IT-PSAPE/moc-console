import { useCallback } from "react"
import { Modal } from "@moc/ui/components/overlays/modal"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { playbackModeLabel, playlistTransitionLabel } from "@moc/types/broadcast"
import type { MediaItem, PlaybackMode, Playlist, PlaylistTransition } from "@moc/types/broadcast"
import { Check, ChevronDown, Music, X } from "lucide-react"

const allPlaybackModes: PlaybackMode[] = ["loop", "stop", "sequence"]
const allTransitions: PlaylistTransition[] = ["cut", "fade", "crossfade"]

type PlaylistSettingsModalProps = {
  open: boolean
  playlist: Playlist
  media: MediaItem[]
  contextPlaylists: Playlist[]
  onClose: () => void
  onSelectBackgroundMusic: (item: MediaItem) => void
  onRemoveBackgroundMusic: () => void
  onDefaultImageDurationChange: (value: string) => void
  onDefaultImageDurationBlur: () => void
  onPlaybackModeChange: (mode: PlaybackMode) => void
  onNextPlaylistChange: (nextId: string) => void
  onTransitionChange: (transition: PlaylistTransition) => void
  onTransitionDurationChange: (value: string) => void
  onTransitionDurationBlur: () => void
}

export function PlaylistSettingsModal({ open, playlist, media, contextPlaylists, onClose, onSelectBackgroundMusic, onRemoveBackgroundMusic, onDefaultImageDurationChange, onDefaultImageDurationBlur, onPlaybackModeChange, onNextPlaylistChange, onTransitionChange, onTransitionDurationChange, onTransitionDurationBlur }: PlaylistSettingsModalProps) {
  const audioItems = media.filter((m) => m.type === "audio")
  const otherPlaylists = contextPlaylists.filter((p) => p.id !== playlist.id)

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) onClose()
  }, [onClose])

  const handleDefaultDurationInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onDefaultImageDurationChange(e.target.value)
  }, [onDefaultImageDurationChange])

  const handleTransitionDurationInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTransitionDurationChange(e.target.value)
  }, [onTransitionDurationChange])

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="w-full max-w-md">
            <Modal.Header>
              <Label.md className="flex-1">Playback settings</Label.md>
              <Modal.Close>
                <Button.Icon variant="ghost" icon={<X />} aria-label="Close settings" />
              </Modal.Close>
            </Modal.Header>
            <Modal.Content>
              <div className="space-y-5 p-4">
                <div className="flex flex-col space-y-1.5 w-full">
                  <Label.xs className="text-tertiary">Overlay audio</Label.xs>
                  {playlist.backgroundMusicUrl ? (
                    <div className="flex items-center gap-2">
                      <Paragraph.xs className="flex-1 truncate text-primary">{playlist.backgroundMusicName ?? "Audio"}</Paragraph.xs>
                      <audio src={playlist.backgroundMusicUrl} controls preload="metadata" className="h-6 max-w-36" />
                      <Button.Icon variant="ghost" icon={<X />} aria-label="Remove audio" onClick={onRemoveBackgroundMusic} />
                    </div>
                  ) : (
                    <Dropdown placement="bottom">
                      <Dropdown.Trigger>
                        <Button variant="secondary" iconPosition="trailing" icon={<ChevronDown />}>Select audio…</Button>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {audioItems.map((audioItem) => (
                          <Dropdown.Item key={audioItem.id} onSelect={() => onSelectBackgroundMusic(audioItem)}>
                            <Music className="size-4" />
                            {audioItem.name}
                          </Dropdown.Item>
                        ))}
                        {audioItems.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-quaternary">No audio in library</div>
                        )}
                      </Dropdown.Panel>
                    </Dropdown>
                  )}
                </div>

                <div className="flex flex-col space-y-1.5  w-full">
                  <Label.xs className="text-tertiary">Default image duration</Label.xs>
                  <div className="flex items-center gap-2">
                    <Input
                      value={String(playlist.defaultImageDuration)}
                      onChange={handleDefaultDurationInput}
                      onBlur={onDefaultImageDurationBlur}
                      placeholder="sec"
                      className="w-full"
                    />
                    <Paragraph.xs className="text-tertiary">seconds</Paragraph.xs>
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <Label.xs className="text-tertiary">At end</Label.xs>
                  <Dropdown placement="bottom">
                    <Dropdown.Trigger className="w-full">
                      <Button variant="secondary" iconPosition="trailing" icon={<ChevronDown />}>
                        {playbackModeLabel[playlist.playbackMode]}
                      </Button>
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                      {allPlaybackModes.map((m) => (
                        <Dropdown.Item key={m} onSelect={() => onPlaybackModeChange(m)}>
                          <span className="flex size-4 shrink-0 items-center justify-center">
                            {m === playlist.playbackMode && <Check className="size-3.5 text-brand_secondary" />}
                          </span>
                          {playbackModeLabel[m]}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Panel>
                  </Dropdown>
                  {playlist.playbackMode === "sequence" && (
                    <Dropdown placement="bottom">
                      <Dropdown.Trigger>
                        <Button variant="secondary" iconPosition="trailing" icon={<ChevronDown />} className="mt-1.5">
                          {contextPlaylists.find((p) => p.id === playlist.nextPlaylistId)?.name ?? "Select playlist…"}
                        </Button>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {otherPlaylists.map((p) => (
                          <Dropdown.Item key={p.id} onSelect={() => onNextPlaylistChange(p.id)}>
                            <span className="flex size-4 shrink-0 items-center justify-center">
                              {p.id === playlist.nextPlaylistId && <Check className="size-3.5 text-brand_secondary" />}
                            </span>
                            {p.name}
                          </Dropdown.Item>
                        ))}
                        {otherPlaylists.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-quaternary">No other playlists</div>
                        )}
                      </Dropdown.Panel>
                    </Dropdown>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label.xs className="text-tertiary">Transition</Label.xs>
                  <div className="flex items-center gap-2">
                    <Dropdown placement="bottom">
                      <Dropdown.Trigger>
                        <Button variant="secondary" iconPosition="trailing" icon={<ChevronDown />}>
                          {playlistTransitionLabel[playlist.transition]}
                        </Button>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {allTransitions.map((t) => (
                          <Dropdown.Item key={t} onSelect={() => onTransitionChange(t)}>
                            <span className="flex size-4 shrink-0 items-center justify-center">
                              {t === playlist.transition && <Check className="size-3.5 text-brand_secondary" />}
                            </span>
                            {playlistTransitionLabel[t]}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Panel>
                    </Dropdown>
                    {playlist.transition !== "cut" && (
                      <>
                        <Input
                          value={String(playlist.transitionDurationMs)}
                          onChange={handleTransitionDurationInput}
                          onBlur={onTransitionDurationBlur}
                          placeholder="ms"
                          className="!w-24"
                        />
                        <Paragraph.xs className="text-tertiary">ms</Paragraph.xs>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Modal.Content>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
