import { Button } from '@moc/ui/components/controls/button'
import { Label } from '@moc/ui/components/display/text'
import { CUE_TYPES } from '@moc/types/cue-sheet'
import type { CueType } from '@moc/types/cue-sheet'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { Filter, Minus, Plus, Music, Wrench, Monitor, Megaphone, ArrowRightLeft, Radio } from 'lucide-react'
import { useTimeline } from './timeline-context'
import { CUE_TYPE_CONFIG } from './timeline-types'
import { cn } from '@moc/utils/cn'
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
    renderActions?: () => ReactNode
    showAddCue?: boolean
}

export function TimelineToolbar({ renderTitle, renderActions, showAddCue = true }: TimelineToolbarProps) {
    const { filter, setFilter, updateZoomAnchoredToPlayhead, openCreateModal, readOnly, playbackSync } = useTimeline()

    return (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-secondary bg-secondary_alt">
            {/* Title area */}
            <div className="flex-1 min-w-0">
                {renderTitle ? renderTitle() : null}
            </div>

            {/* Live sync indicator */}
            {playbackSync && (
                <span
                    className={cn(
                        'flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide',
                        playbackSync.role === 'controller'
                            ? 'bg-utility-green-500/15 text-utility-green-500'
                            : 'bg-utility-blue-500/15 text-utility-blue-500',
                    )}
                    title={playbackSync.role === 'controller' ? 'Broadcasting playback to all viewers' : 'Following live playback'}
                >
                    <Radio className="size-3 animate-pulse" />
                    <Label.xs className="text-[10px] uppercase tracking-wide leading-none">
                        {playbackSync.role === 'controller' ? 'Live' : 'Following'}
                    </Label.xs>
                </span>
            )}

            {/* Custom actions slot (e.g. Share button) */}
            {renderActions ? renderActions() : null}

            {/* Filter */}
            <Dropdown>
                <Dropdown.Trigger>
                    <Button.Icon
                        variant={filter !== 'all' ? 'secondary' : 'ghost'}
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
            </Dropdown>

            {/* Zoom controls */}
            <div className="flex items-center gap-0.5">
                <Button.Icon variant="ghost" icon={<Minus />} onClick={() => updateZoomAnchoredToPlayhead('out')} />
                <Button.Icon variant="ghost" icon={<Plus />} onClick={() => updateZoomAnchoredToPlayhead('in')} />
            </div>

            {/* Add cue */}
            {!readOnly && showAddCue && (
                <Button variant="secondary" icon={<Plus />} onClick={() => openCreateModal()}>
                    Add Cue
                </Button>
            )}
        </div>
    )
}
