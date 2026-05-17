import type { ReactNode } from 'react'
import { Timeline as Primitive } from '@moc/ui/components/timeline'
import { Button } from '@moc/ui/components/controls/button'
import { Label } from '@moc/ui/components/display/text'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { CUE_TYPES } from '@moc/types/cue-sheet'
import type { CueType } from '@moc/types/cue-sheet'
import { cn } from '@moc/utils/cn'
import { Filter, Plus, Radio } from 'lucide-react'
import { CUE_TYPE_CONFIG, type CueFilter } from './timeline-types'
import { CUE_TYPE_ICONS } from './cue-type-icons'
import { useTimeline } from './cue-domain'

export type CueSheetToolbarProps = {
    renderTitle?: () => ReactNode
    renderActions?: () => ReactNode
    showAddCue?: boolean
}

export function CueSheetToolbar({ renderTitle, renderActions, showAddCue = true }: CueSheetToolbarProps) {
    const { filter, setFilter, openCreateModal, readOnly, playbackSync } = useTimeline()

    function handleAddCue() {
        openCreateModal()
    }

    function handleClearFilter() {
        setFilter('all')
    }

    return (
        <Primitive.Toolbar>
            <div className="flex-1 min-w-0">{renderTitle?.()}</div>

            {playbackSync && (
                <span
                    className={cn('flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide',
                        playbackSync.role === 'controller' ? 'bg-utility-green-500/15 text-utility-green-500' : 'bg-utility-blue-500/15 text-utility-blue-500')}
                    title={playbackSync.role === 'controller' ? 'Broadcasting playback to all viewers' : 'Following live playback'}
                >
                    <Radio className="size-3 animate-pulse" />
                    <Label.xs className="text-[10px] uppercase tracking-wide leading-none">
                        {playbackSync.role === 'controller' ? 'Live' : 'Following'}
                    </Label.xs>
                </span>
            )}

            {renderActions?.()}

            <Dropdown>
                <Dropdown.Trigger>
                    <Button.Icon variant={filter !== 'all' ? 'secondary' : 'ghost'} icon={<Filter />} />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    <Dropdown.Item onSelect={handleClearFilter}>All Types</Dropdown.Item>
                    <Dropdown.Separator />
                    {CUE_TYPES.map((type) => (
                        <FilterTypeItem key={type} type={type} onSelect={setFilter} />
                    ))}
                </Dropdown.Panel>
            </Dropdown>

            <div className="flex items-center gap-0.5">
                <Primitive.Toolbar.ZoomOut />
                <Primitive.Toolbar.ZoomIn />
            </div>

            {!readOnly && showAddCue && (
                <Button variant="secondary" icon={<Plus />} onClick={handleAddCue}>Add Cue</Button>
            )}
        </Primitive.Toolbar>
    )
}

function FilterTypeItem({ type, onSelect }: { type: CueType; onSelect: (f: CueFilter) => void }) {
    function handleSelect() {
        onSelect(type)
    }

    return (
        <Dropdown.Item onSelect={handleSelect}>
            <span className="flex items-center gap-2">{CUE_TYPE_ICONS[type]} {CUE_TYPE_CONFIG[type].label}</span>
        </Dropdown.Item>
    )
}
