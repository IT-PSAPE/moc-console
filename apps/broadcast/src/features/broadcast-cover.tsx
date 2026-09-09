import { cn } from "@moc/utils/cn"
import { Music2 } from "lucide-react"

type BroadcastCoverProps = {
  className?: string
  coverUrl: string | null
  iconClassName?: string
  title: string
}

/** Embedded cover art when the file carries some, a neutral placeholder when not. */
export function BroadcastCover({ className, coverUrl, iconClassName, title }: BroadcastCoverProps) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-tertiary", className)}>
      {coverUrl ? (
        <img src={coverUrl} alt={`Cover art for ${title}`} className="size-full object-cover" />
      ) : (
        <Music2 className={cn("text-quaternary", iconClassName)} aria-hidden="true" />
      )}
    </div>
  )
}
