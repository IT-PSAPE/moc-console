import { AudioLines } from "lucide-react"

export function BroadcastArtwork() {
  return (
    <div className="flex aspect-square max-h-full w-full max-w-sm items-center justify-center rounded-2xl border border-secondary bg-secondary">
      <span className="flex size-24 items-center justify-center rounded-full bg-brand_solid text-primary_on-brand sm:size-32">
        <AudioLines className="size-10 sm:size-14" aria-hidden="true" />
      </span>
    </div>
  )
}
