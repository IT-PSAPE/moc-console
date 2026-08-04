import type { ComponentType } from 'react'
import {
    DndContext,
    DragOverlay,
    closestCenter,
    type Announcements,
    type ScreenReaderInstructions,
} from '@dnd-kit/core'
import { Accordion } from '@moc/ui/components/display/accordion'
import type { Checklist, ChecklistItem } from '@moc/types/checklists'
import { cn } from '@moc/utils/cn'
import { CheckRowGhost } from './check-row-ghost'
import { DraggableCheckRow } from './draggable-check-row'
import { DropIndicatorLine } from './drop-indicator-line'
import { DroppableZone } from './droppable-zone'
import { InlineItemInput } from './inline-item-input'
import { InlineSectionInput } from './inline-section-input'
import { SectionGhost } from './section-ghost'
import { SectionRow } from './section-row'
import type { ChecklistAddRequest } from './checklist-types'
import { useChecklistContent } from './use-checklist-content'

export { getChecklistCounts } from './checklist-helpers'

const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: 'To reorder a checklist item or section, press Space. Use the arrow keys to move it, press Space to drop it, or Escape to cancel.',
}

const announcements: Announcements = {
    onDragStart({ active }) {
        return `Picked up ${active.id.toString().startsWith('section:') ? 'checklist section' : 'checklist item'}.`
    },
    onDragOver({ over }) {
        if (!over) return 'The item is not over a valid drop target.'
        if (over.id.toString().startsWith('section:')) return 'Moving over a checklist section.'
        if (over.id.toString().startsWith('container:')) return 'Moving to a checklist item group.'
        return 'Moving over a checklist item.'
    },
    onDragEnd({ over }) {
        return over ? 'Item moved.' : 'Item was not moved.'
    },
    onDragCancel() {
        return 'Reordering cancelled.'
    },
}

// ─── Main checklist content ─────────────────────────────────────────

type ChecklistContentProps = {
    checklist: Checklist
    onUpdate: (checklist: Checklist) => void
    /** Set externally to trigger an add-item or add-section input */
    addRequest?: ChecklistAddRequest
    /** Called when the inline input is dismissed */
    onAddRequestDismiss?: () => void
    className?: string
    /** Render extra UI inside each item row (e.g. assignee avatars). */
    itemSlot?: ComponentType<{ item: ChecklistItem }>
}

export function ChecklistContent({ checklist, onUpdate, addRequest = null, onAddRequestDismiss, className, itemSlot }: ChecklistContentProps) {
    const content = useChecklistContent(checklist, onUpdate, addRequest, onAddRequestDismiss)
    const { state, actions, meta } = content

    return (
        <DndContext
            sensors={meta.sensors}
            collisionDetection={closestCenter}
            accessibility={{ announcements, screenReaderInstructions }}
            onDragStart={actions.startDrag}
            onDragOver={actions.dragOver}
            onDragEnd={actions.endDrag}
            onDragCancel={actions.cancelDrag}
        >
            <div className={cn('flex flex-col', className)}>
                {/* Ungrouped items — always at the top */}
                <DroppableZone id="container:top" className={cn('flex flex-col', meta.hasSections && 'border-b border-secondary pb-1')}>
                    {checklist.items.map((item, index) => {
                        const itemDndId = `item:${item.id}`
                        const isOverTarget = state.overId === itemDndId && state.activeId && state.activeId !== itemDndId
                        const showAbove = isOverTarget && meta.topActiveIndex > index
                        const showBelow = isOverTarget && (meta.topActiveIndex < index || meta.topActiveIndex === -1)

                        return (
                            <div key={item.id} className="relative">
                                {showAbove && <DropIndicatorLine />}
                                <DraggableCheckRow item={item} onToggle={actions.toggle} onRename={actions.renameItem} onDelete={actions.deleteItem} itemSlot={itemSlot} />
                                {showBelow && <DropIndicatorLine />}
                            </div>
                        )
                    })}
                    {state.currentAdd?.type === 'item' && state.currentAdd.target === 'top' && (
                        <InlineItemInput
                            onSubmit={actions.addTopItem}
                            onDismiss={actions.dismissAdd}
                        />
                    )}
                </DroppableZone>

                {/* Sections with accordion */}
                {meta.hasSections && (
                    <Accordion type="multiple" defaultValue={checklist.sections.map((s) => s.id)} data-main>
                        {checklist.sections.map((section) => (
                            <SectionRow
                                key={section.id}
                                section={section}
                                onToggle={actions.toggle}
                                onAddItem={actions.addSectionItem}
                                onRenameItem={actions.renameItem}
                                onDeleteItem={actions.deleteItem}
                                onRenameSection={actions.renameSection}
                                onDeleteSection={actions.deleteSection}
                                activeItemId={state.activeId}
                                overItemId={state.overId}
                                isAddingItem={state.currentAdd?.type === 'item' && state.currentAdd.target === section.id}
                                onRequestAddItem={actions.requestAddInSection}
                                onDismissAdd={actions.dismissAdd}
                                itemSlot={itemSlot}
                            />
                        ))}
                    </Accordion>
                )}

                {/* Add section input — only when triggered */}
                {state.currentAdd?.type === 'section' && (
                    <InlineSectionInput
                        onSubmit={actions.addSection}
                        onDismiss={actions.dismissAdd}
                    />
                )}
            </div>

            <DragOverlay>
                {meta.activeItem && <CheckRowGhost item={meta.activeItem} />}
                {meta.activeSection && <SectionGhost section={meta.activeSection} />}
            </DragOverlay>
        </DndContext>
    )
}
