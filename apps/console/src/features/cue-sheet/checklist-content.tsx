import { useCallback, useState, type ReactNode } from 'react'
import { randomId } from '@moc/utils/random-id'
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    type DragEndEvent,
    type DragStartEvent,
    type DragOverEvent,
} from '@dnd-kit/core'
import { Accordion } from '@moc/ui/components/display/accordion'
import type { Checklist, ChecklistItem, ChecklistSection } from '@moc/types/cue-sheet'
import { cn } from '@moc/utils/cn'
import {
    findItem,
    findItemContainer,
    insertItemAt,
    removeItemFrom,
    reorder,
} from './checklist-helpers'
import {
    CheckRowGhost,
    DraggableCheckRow,
    DropIndicatorLine,
    DroppableZone,
    InlineItemInput,
    InlineSectionInput,
    SectionGhost,
    SectionRow,
} from './checklist-rows'

export { getChecklistCounts } from './checklist-helpers'

// ─── Main checklist content ─────────────────────────────────────────

export type AddRequest = { type: 'item'; target: 'top' | string } | { type: 'section' } | null

type ChecklistContentProps = {
    checklist: Checklist
    onUpdate: (checklist: Checklist) => void
    /** Set externally to trigger an add-item or add-section input */
    addRequest?: AddRequest
    /** Called when the inline input is dismissed */
    onAddRequestDismiss?: () => void
    className?: string
    /** Render extra UI inside each item row (e.g. assignee avatars). */
    renderItemSlot?: (item: ChecklistItem) => ReactNode
}

export function ChecklistContent({ checklist, onUpdate, addRequest = null, onAddRequestDismiss, className, renderItemSlot }: ChecklistContentProps) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    const [activeId, setActiveId] = useState<string | null>(null)
    const [overId, setOverId] = useState<string | null>(null)

    // ── Local add state (for section + buttons) ─────────────
    const [localAdd, setLocalAdd] = useState<AddRequest>(null)

    // Merge external addRequest with local state
    const currentAdd = addRequest ?? localAdd
    const dismissAdd = useCallback(() => {
        setLocalAdd(null)
        onAddRequestDismiss?.()
    }, [onAddRequestDismiss])

    // ── Toggle any item ─────────────────────────────────────
    function handleToggle(itemId: string) {
        const topIdx = checklist.items.findIndex((i) => i.id === itemId)
        if (topIdx !== -1) {
            onUpdate({
                ...checklist,
                items: checklist.items.map((i) => i.id === itemId ? { ...i, checked: !i.checked } : i),
            })
            return
        }
        onUpdate({
            ...checklist,
            sections: checklist.sections.map((s) => ({
                ...s,
                items: s.items.map((i) => i.id === itemId ? { ...i, checked: !i.checked } : i),
            })),
        })
    }

    // ── Add items / sections ────────────────────────────────
    function handleAddTopItem(label: string) {
        const newItem: ChecklistItem = { id: randomId(), label, checked: false }
        onUpdate({ ...checklist, items: [...checklist.items, newItem] })
    }

    function handleAddSectionItem(sectionId: string, label: string) {
        const newItem: ChecklistItem = { id: randomId(), label, checked: false }
        onUpdate({
            ...checklist,
            sections: checklist.sections.map((s) =>
                s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s,
            ),
        })
    }

    function handleAddSection(name: string) {
        const newSection: ChecklistSection = { id: randomId(), name, items: [] }
        onUpdate({ ...checklist, sections: [...checklist.sections, newSection] })
    }

    function handleRenameItem(itemId: string, label: string) {
        const topItem = checklist.items.find((item) => item.id === itemId)
        if (topItem) {
            onUpdate({
                ...checklist,
                items: checklist.items.map((item) => item.id === itemId ? { ...item, label } : item),
            })
            return
        }

        onUpdate({
            ...checklist,
            sections: checklist.sections.map((section) => ({
                ...section,
                items: section.items.map((item) => item.id === itemId ? { ...item, label } : item),
            })),
        })
    }

    function handleDeleteItem(itemId: string) {
        onUpdate(removeItemFrom(checklist, itemId))
    }

    function handleRenameSection(sectionId: string, name: string) {
        onUpdate({
            ...checklist,
            sections: checklist.sections.map((section) => section.id === sectionId ? { ...section, name } : section),
        })
    }

    function handleDeleteSection(sectionId: string) {
        const section = checklist.sections.find((entry) => entry.id === sectionId)
        if (!section) return

        onUpdate({
            ...checklist,
            items: [...checklist.items, ...section.items],
            sections: checklist.sections.filter((entry) => entry.id !== sectionId),
        })
    }

    // ── Section + button triggers add ───────────────────────
    function handleRequestAddInSection(sectionId: string) {
        setLocalAdd({ type: 'item', target: sectionId })
    }

    // ── Unified DnD handlers ────────────────────────────────
    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(String(event.active.id))
    }, [])

    const handleDragOver = useCallback((event: DragOverEvent) => {
        setOverId(event.over ? String(event.over.id) : null)
    }, [])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)
        setOverId(null)

        if (!over || active.id === over.id) return

        const activeStr = String(active.id)
        const overStr = String(over.id)

        if (activeStr.startsWith('section:') && overStr.startsWith('section:')) {
            const fromId = activeStr.replace('section:', '')
            const toId = overStr.replace('section:', '')
            const fromIdx = checklist.sections.findIndex((s) => s.id === fromId)
            const toIdx = checklist.sections.findIndex((s) => s.id === toId)
            if (fromIdx === -1 || toIdx === -1) return
            onUpdate({ ...checklist, sections: reorder(checklist.sections, fromIdx, toIdx) })
            return
        }

        if (activeStr.startsWith('item:')) {
            const itemId = activeStr.replace('item:', '')
            const item = findItem(checklist, itemId)
            if (!item) return

            const sourceContainer = findItemContainer(checklist, itemId)
            if (!sourceContainer) return

            if (overStr.startsWith('item:')) {
                const targetItemId = overStr.replace('item:', '')
                const targetContainer = findItemContainer(checklist, targetItemId)
                if (!targetContainer) return

                const targetItems = targetContainer === 'top'
                    ? checklist.items
                    : checklist.sections.find((s) => s.id === targetContainer)!.items
                const targetIdx = targetItems.findIndex((i) => i.id === targetItemId)

                if (sourceContainer === targetContainer) {
                    const sourceIdx = targetItems.findIndex((i) => i.id === itemId)
                    if (sourceContainer === 'top') {
                        onUpdate({ ...checklist, items: reorder(checklist.items, sourceIdx, targetIdx) })
                    } else {
                        onUpdate({
                            ...checklist,
                            sections: checklist.sections.map((s) =>
                                s.id === sourceContainer ? { ...s, items: reorder(s.items, sourceIdx, targetIdx) } : s,
                            ),
                        })
                    }
                } else {
                    let updated = removeItemFrom(checklist, itemId)
                    const newTargetItems = targetContainer === 'top'
                        ? updated.items
                        : updated.sections.find((s) => s.id === targetContainer)!.items
                    const newTargetIdx = newTargetItems.findIndex((i) => i.id === targetItemId)
                    updated = insertItemAt(updated, targetContainer, item, newTargetIdx >= 0 ? newTargetIdx : newTargetItems.length)
                    onUpdate(updated)
                }
                return
            }

            if (overStr.startsWith('container:')) {
                const targetContainer = overStr.replace('container:', '')
                if (sourceContainer === targetContainer) return
                let updated = removeItemFrom(checklist, itemId)
                const targetItems = targetContainer === 'top'
                    ? updated.items
                    : updated.sections.find((s) => s.id === targetContainer)?.items ?? []
                updated = insertItemAt(updated, targetContainer, item, targetItems.length)
                onUpdate(updated)
            }
        }
    }, [checklist, onUpdate])

    const handleDragCancel = useCallback(() => {
        setActiveId(null)
        setOverId(null)
    }, [])

    // ── Resolve drag ghost ──────────────────────────────────
    const activeItem = activeId?.startsWith('item:')
        ? findItem(checklist, activeId.replace('item:', ''))
        : null
    const activeSection = activeId?.startsWith('section:')
        ? checklist.sections.find((s) => s.id === activeId.replace('section:', '')) ?? null
        : null

    const topActiveIndex = activeId?.startsWith('item:')
        ? checklist.items.findIndex((i) => `item:${i.id}` === activeId)
        : -1

    const hasSections = checklist.sections.length > 0

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <div className={cn('flex flex-col', className)}>
                {/* Ungrouped items — always at the top */}
                <DroppableZone id="container:top" className={cn('flex flex-col', hasSections && 'border-b border-secondary pb-1')}>
                    {checklist.items.map((item, index) => {
                        const itemDndId = `item:${item.id}`
                        const isOverTarget = overId === itemDndId && activeId && activeId !== itemDndId
                        const showAbove = isOverTarget && topActiveIndex > index
                        const showBelow = isOverTarget && (topActiveIndex < index || topActiveIndex === -1)

                        return (
                            <div key={item.id} className="relative">
                                {showAbove && <DropIndicatorLine />}
                                <DraggableCheckRow item={item} onToggle={handleToggle} onRename={handleRenameItem} onDelete={handleDeleteItem} renderItemSlot={renderItemSlot} />
                                {showBelow && <DropIndicatorLine />}
                            </div>
                        )
                    })}
                    {currentAdd?.type === 'item' && currentAdd.target === 'top' && (
                        <InlineItemInput
                            onSubmit={handleAddTopItem}
                            onDismiss={dismissAdd}
                        />
                    )}
                </DroppableZone>

                {/* Sections with accordion */}
                {hasSections && (
                    <Accordion type="multiple" defaultValue={checklist.sections.map((s) => s.id)} data-main>
                        {checklist.sections.map((section) => (
                            <SectionRow
                                key={section.id}
                                section={section}
                                onToggle={handleToggle}
                                onAddItem={handleAddSectionItem}
                                onRenameItem={handleRenameItem}
                                onDeleteItem={handleDeleteItem}
                                onRenameSection={handleRenameSection}
                                onDeleteSection={handleDeleteSection}
                                activeItemId={activeId}
                                overItemId={overId}
                                isAddingItem={currentAdd?.type === 'item' && currentAdd.target === section.id}
                                onRequestAddItem={handleRequestAddInSection}
                                onDismissAdd={dismissAdd}
                                renderItemSlot={renderItemSlot}
                            />
                        ))}
                    </Accordion>
                )}

                {/* Add section input — only when triggered */}
                {currentAdd?.type === 'section' && (
                    <InlineSectionInput
                        onSubmit={handleAddSection}
                        onDismiss={dismissAdd}
                    />
                )}
            </div>

            <DragOverlay>
                {activeItem && <CheckRowGhost item={activeItem} />}
                {activeSection && <SectionGhost section={activeSection} />}
            </DragOverlay>
        </DndContext>
    )
}
