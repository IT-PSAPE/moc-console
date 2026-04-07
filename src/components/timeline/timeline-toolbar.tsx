import { Button } from '@/components/controls/button'
import { CUE_TYPES } from '@/types/cue-sheet'
import type { CueType } from '@/types/cue-sheet'
import { Dropdown } from '@/components/overlays/dropdown'
import { Filter, Minus, Plus, Music, Wrench, Monitor, Megaphone, ArrowRightLeft } from 'lucide-react'
import { useTimeline } from './timeline-context'
import { CUE_TYPE_CONFIG } from './timeline-types'
import type { ReactNode } from 'react'

// ─── Cue type → Lucide icon ───────────────────────────────────────

const CUE_TYPE_ICONS: Record<CueType, ReactNode> = {
    performance: <Music className="size-3.5" />,
    technical: <Wrench className="size-3.5" />,
    equipment: <Monitor className="size-3.5" />,
    announcement: <Megaphone className="size-3.5" />,
    transition: <ArrowRightLeft className="size-3.5" />,
}

// ─── Toolbar ───────────────────────────────────────────────────────

type TimelineToolbarProps = {
    renderTitle?: () => ReactNode
}

export function TimelineToolbar({ renderTitle }: TimelineToolbarProps) {
    const { filter, setFilter, updateZoomAnchoredToPlayhead, openCreateModal } = useTimeline()

    return (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-secondary bg-secondary_alt">
            {/* Title area */}
            <div className="flex-1 min-w-0">
                {renderTitle ? renderTitle() : null}
            </div>

            {/* Filter */}
            <Dropdown.Root>
                <Dropdown.Trigger>
                    <Button
                        variant={filter !== 'all' ? 'secondary' : 'ghost'}
                        iconOnly
                        icon={<Filter />}
                    />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    <Dropdown.Item onSelect={() => setFilter('all')}>
                        All Types
                    </Dropdown.Item>
                    <Dropdown.Separator />
                    {CUE_TYPES.map((type) => (
                        <Dropdown.Item key={type} onSelect={() => setFilter(type)}>
                            <span className="flex items-center gap-2">
                                {CUE_TYPE_ICONS[type]}
                                {CUE_TYPE_CONFIG[type].label}
                            </span>
                        </Dropdown.Item>
                    ))}
                </Dropdown.Panel>
            </Dropdown.Root>

            {/* Zoom controls */}
            <div className="flex items-center gap-0.5">
                <Button variant="ghost" iconOnly icon={<Minus />} onClick={() => updateZoomAnchoredToPlayhead('out')} />
                <Button variant="ghost" iconOnly icon={<Plus />} onClick={() => updateZoomAnchoredToPlayhead('in')} />
            </div>

            {/* Add cue */}
            <Button variant="secondary" icon={<Plus />} onClick={() => openCreateModal()}>
                Add Cue
            </Button>
        </div>
    )
}
