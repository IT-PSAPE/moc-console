import type { ReactNode } from 'react'
import type { CueType } from '@moc/types/cue-sheet'
import { ArrowRightLeft, Megaphone, Monitor, Music, Wrench } from 'lucide-react'

// ─── Cue type → icon ───────────────────────────────────────────────

export const CUE_TYPE_ICONS: Record<CueType, ReactNode> = {
    performance: <Music className="size-3" />,
    technical: <Wrench className="size-3" />,
    equipment: <Monitor className="size-3" />,
    announcement: <Megaphone className="size-3" />,
    transition: <ArrowRightLeft className="size-3" />,
}
