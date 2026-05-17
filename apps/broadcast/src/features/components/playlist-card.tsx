import { Play } from 'lucide-react'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'
import { CoverArt } from '@/features/components/cover-art'

type PlaylistCardProps = {
  playable: PlayablePlaylist
  meta: string
  isSelected: boolean
  onSelect: (id: string) => void
  onOpen: (id: string) => void
}

export function PlaylistCard({ playable, meta, isSelected, onSelect, onOpen }: PlaylistCardProps) {
  function handleSelect() {
    onSelect(playable.playlist.id)
  }

  function handleOpen() {
    onOpen(playable.playlist.id)
  }

  return (
    <div
      onClick={handleSelect}
      onDoubleClick={handleOpen}
      aria-pressed={isSelected}
      className="group !block shrink-0 w-64 max-mobile:w-48 !rounded-xl !border-transparent !bg-transparent !p-0 text-left hover:!bg-transparent"
    >
      <div
        className={`w-full relative aspect-video w-full overflow-hidden rounded-xl border transition-all ${isSelected
          ? 'border-transparent ring-3 ring-white'
          : 'border-tertiary hover:border-secondary'
          }`}
      >
        <CoverArt
          playable={playable}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="size-12 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-75 group-hover:scale-100">
            <Play className="size-5 text-black opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        </div>
      </div>
      <Label.md className={`mt-2.5 block truncate ${isSelected ? 'text-primary' : 'text-secondary'}`}>
        {playable.playlist.name}
      </Label.md>
      <Paragraph.sm className="text-tertiary truncate">{meta}</Paragraph.sm>
    </div>
  )
}
