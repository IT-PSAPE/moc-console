import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { randomId } from '@/utils/random-id'
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
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Accordion } from '@/components/display/accordion'
import { Label, Paragraph } from '@/components/display/text'
import type { Checklist, ChecklistItem, ChecklistSection } from '@/types/cue-sheet'
import { Check, ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Input } from '@/components/form/input'
import { InlineEditableText } from '@/components/form/inline-editable-text'

// ─── Helpers ────────────────────────────────────────────────────────

function getAllItems(checklist: Checklist): ChecklistItem[] {
    return [
        ...checklist.items,
        ...checklist.sections.flatMap((s) => s.items),
    ]
}

export function getChecklistCounts(checklist: Checklist) {
    const all = getAllItems(checklist)
    return { total: all.length, checked: all.filter((i) => i.checked).length }
}

function reorder<T>(list: T[], fromIndex: number, toIndex: number): T[] {
    const result = [...list]
    const [moved] = result.splice(fromIndex, 1)
    result.splice(toIndex, 0, moved)
    return result
}

function findItemContainer(checklist: Checklist, itemId: string): string | null {
    if (checklist.items.some((i) => i.id === itemId)) return 'top'
    for (const s of checklist.sections) {
        if (s.items.some((i) => i.id === itemId)) return s.id
    }
    return null
}

function findItem(checklist: Checklist, itemId: string): ChecklistItem | null {
    const top = checklist.items.find((i) => i.id === itemId)
    if (top) return top
    for (const s of checklist.sections) {
        const found = s.items.find((i) => i.id === itemId)
        if (found) return found
    }
    return null
}

function removeItemFrom(checklist: Checklist, itemId: string): Checklist {
    return {
        ...checklist,
        items: checklist.items.filter((i) => i.id !== itemId),
        sections: checklist.sections.map((s) => ({
            ...s,
            items: s.items.filter((i) => i.id !== itemId),
        })),
    }
}

function insertItemAt(checklist: Checklist, containerId: string, item: ChecklistItem, index: number): Checklist {
    if (containerId === 'top') {
        const items = [...checklist.items]
        items.splice(index, 0, item)
        return { ...checklist, items }
    }
    return {
        ...checklist,
        sections: checklist.sections.map((s) => {
            if (s.id !== containerId) return s
            const items = [...s.items]
            items.splice(index, 0, item)
            return { ...s, items }
        }),
    }
}

// ─── Drop indicator ─────────────────────────────────────────────────

function DropIndicatorLine() {
    return (
        <div className="relative h-0 z-10 pointer-events-none">
            <div className="absolute inset-x-3 h-0.5 -top-px bg-brand rounded-full" />
            <div className="absolute left-2 -top-1 size-2.5 rounded-full bg-brand" />
            <div className="absolute right-2 -top-1 size-2.5 rounded-full bg-brand" />
        </div>
    )
}

// ─── Inline input hooks ─────────────────────────────────────────────

function useInlineInput(onSubmit: (value: string) => void, onDismiss: () => void) {
    const [value, setValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        requestAnimationFrame(() => inputRef.current?.focus())
    }, [])

    function handleSubmit() {
        const trimmed = value.trim()
        if (trimmed) {
            onSubmit(trimmed)
            setValue('')
        }
        onDismiss()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') handleSubmit()
        if (e.key === 'Escape') { onDismiss(); setValue('') }
    }

    return { value, setValue, inputRef, handleSubmit, handleKeyDown }
}

// ─── Inline item input (looks like a checklist row) ─────────────────

function InlineItemInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
    const { value, setValue, inputRef, handleSubmit, handleKeyDown } = useInlineInput(onSubmit, onDismiss)

    return (
        <div className="flex items-center gap-1 px-3 py-1.5">
            <span className="shrink-0 text-quaternary"><GripVertical className="size-4 invisible" /></span>
            <div className="flex items-center gap-3 flex-1">
                <div className="size-5 shrink-0 rounded border border-secondary bg-primary" />
                <Input
                    ref={inputRef}
                    className="flex-1 bg-transparent label-sm text-primary placeholder:text-quaternary outline-none"
                    placeholder="Item label..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSubmit}
                />
            </div>
        </div>
    )
}

// ─── Inline section input (looks like a section header) ─────────────

function InlineSectionInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
    const { value, setValue, inputRef, handleSubmit, handleKeyDown } = useInlineInput(onSubmit, onDismiss)

    return (
        <div className="flex items-center border-b border-secondary">
            <div className="pl-3">
                <GripVertical className="size-4 text-quaternary invisible" />
            </div>
            <div className="flex items-center gap-3 px-2 pl-1.5 py-2.5 flex-1">
                <ChevronDown className="size-4 shrink-0 text-tertiary" />
                <Input
                    ref={inputRef}
                    className="flex-1 bg-transparent label-sm text-primary placeholder:text-quaternary outline-none"
                    placeholder="Section name..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSubmit}
                />
            </div>
        </div>
    )
}

// ─── Draggable check row ────────────────────────────────────────────

type DraggableCheckRowProps = {
    item: ChecklistItem
    onToggle: (id: string) => void
    onRename: (id: string, label: string) => void
    onDelete: (id: string) => void
    renderItemSlot?: (item: ChecklistItem) => ReactNode
}

function DraggableCheckRow({ item, onToggle, onRename, onDelete, renderItemSlot }: DraggableCheckRowProps) {
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: `item:${item.id}` })
    const { setNodeRef: setDropRef } = useDroppable({ id: `item:${item.id}` })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : undefined,
    }

    return (
        <div ref={setDropRef}>
            <div ref={setDragRef} style={style} className="group/item flex items-center gap-1 px-3 py-1.5 hover:bg-background-primary-hover transition-colors w-full">
                <span {...listeners} {...attributes} className="cursor-grab text-quaternary hover:text-secondary shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <GripVertical className="size-4" />
                </span>
                <div className="flex flex-1 items-center gap-3 min-w-0">
                    <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => onToggle(item.id)}
                    >
                        <div
                            className={cn(
                                'size-5 shrink-0 rounded border flex items-center justify-center transition-colors',
                                item.checked ? 'bg-brand_solid border-transparent' : 'border-secondary bg-primary',
                            )}
                        >
                            {item.checked && <Check className="size-3.5 text-white" />}
                        </div>
                    </button>
                    <InlineEditableText
                        value={item.label}
                        onSave={(label) => onRename(item.id, label)}
                        className={cn('label-sm min-w-0 flex-1', item.checked && 'line-through text-tertiary')}
                    />
                </div>
                {renderItemSlot && (
                    <div className="shrink-0">
                        {renderItemSlot(item)}
                    </div>
                )}
                <button
                    type="button"
                    className="shrink-0 rounded p-1 text-quaternary opacity-0 transition-opacity hover:bg-background-primary-hover hover:text-secondary group-hover/item:opacity-100"
                    onClick={() => onDelete(item.id)}
                >
                    <Trash2 className="size-4" />
                </button>
            </div>
        </div>
    )
}

// ─── Ghost overlays for DragOverlay ─────────────────────────────────

function CheckRowGhost({ item }: { item: ChecklistItem }) {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-primary rounded-lg border border-brand shadow-lg opacity-90 rotate-1 scale-[1.02]">
            <span className="text-quaternary shrink-0">
                <GripVertical className="size-4" />
            </span>
            <div
                className={cn(
                    'size-5 shrink-0 rounded border flex items-center justify-center',
                    item.checked ? 'bg-brand_solid border-transparent' : 'border-secondary bg-primary',
                )}
            >
                {item.checked && <Check className="size-3.5 text-white" />}
            </div>
            <Label.sm className={cn(item.checked && 'line-through text-tertiary')}>
                {item.label}
            </Label.sm>
        </div>
    )
}

function SectionGhost({ section }: { section: ChecklistSection }) {
    const checkedCount = section.items.filter((i) => i.checked).length
    return (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-primary rounded-lg border border-brand shadow-lg opacity-90 rotate-1 scale-[1.02]">
            <GripVertical className="size-4 text-quaternary" />
            <ChevronDown className="size-4 text-tertiary" />
            <Label.sm className="flex-1">{section.name}</Label.sm>
            <Paragraph.xs className="text-tertiary">{checkedCount}/{section.items.length}</Paragraph.xs>
        </div>
    )
}

// ─── Draggable section handle ───────────────────────────────────────

function DraggableSectionHandle({ sectionId }: { sectionId: string }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `section:${sectionId}` })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : undefined,
    }

    return (
        <span ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab text-quaternary hover:text-secondary shrink-0 opacity-0 group-hover/section:opacity-100 transition-opacity">
            <GripVertical className="size-4" />
        </span>
    )
}

// ─── Droppable container zone ───────────────────────────────────────

function DroppableZone({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
    const { setNodeRef, isOver } = useDroppable({ id })
    return (
        <div ref={setNodeRef} className={cn(className, isOver && 'bg-brand/5 rounded')}>
            {children}
        </div>
    )
}

// ─── Section component ──────────────────────────────────────────────

type SectionRowProps = {
    section: ChecklistSection
    onToggle: (id: string) => void
    onAddItem: (sectionId: string, label: string) => void
    onRenameItem: (id: string, label: string) => void
    onDeleteItem: (id: string) => void
    onRenameSection: (sectionId: string, name: string) => void
    onDeleteSection: (sectionId: string) => void
    activeItemId: string | null
    overItemId: string | null
    isAddingItem: boolean
    onRequestAddItem: (sectionId: string) => void
    onDismissAdd: () => void
    renderItemSlot?: (item: ChecklistItem) => ReactNode
}

function SectionRow({ section, onToggle, onAddItem, onRenameItem, onDeleteItem, onRenameSection, onDeleteSection, activeItemId, overItemId, isAddingItem, onRequestAddItem, onDismissAdd, renderItemSlot }: SectionRowProps) {
    const { setNodeRef: setSectionDropRef } = useDroppable({ id: `section:${section.id}` })
    const checkedCount = section.items.filter((i) => i.checked).length

    const activeIndex = activeItemId
        ? section.items.findIndex((i) => `item:${i.id}` === activeItemId)
        : -1

    return (
        <div ref={setSectionDropRef}>
            <Accordion.Item value={section.id} className="border-b border-secondary">
                <div className="group/section flex items-center">
                    <div className="pl-3">
                        <DraggableSectionHandle sectionId={section.id} />
                    </div>
                    <Accordion.Trigger className="flex items-center gap-3 px-2 pl-1.5 py-2.5 hover:bg-background-primary-hover transition-colors">
                        <ChevronDown className="size-4 shrink-0 text-tertiary transition-transform data-[state=open]:rotate-180" />
                        <InlineEditableText value={section.name} onSave={(name) => onRenameSection(section.id, name)} className="label-sm text-left" />
                        <Paragraph.xs className="text-tertiary shrink-0">{checkedCount}/{section.items.length}</Paragraph.xs>
                    </Accordion.Trigger>
                    <button
                        type="button"
                        className="shrink-0 mr-2 p-1 rounded text-tertiary hover:text-secondary hover:bg-background-primary-hover transition-colors"
                        onClick={(e) => { e.stopPropagation(); onRequestAddItem(section.id) }}
                    >
                        <Plus className="size-4" />
                    </button>
                    <button
                        type="button"
                        className="shrink-0 mr-2 p-1 rounded text-quaternary hover:text-secondary hover:bg-background-primary-hover transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDeleteSection(section.id) }}
                    >
                        <Trash2 className="size-4" />
                    </button>
                </div>

                <Accordion.Content>
                    <DroppableZone id={`container:${section.id}`} className="flex flex-col min-h-[2rem]">
                        {section.items.map((item, index) => {
                            const itemDndId = `item:${item.id}`
                            const isOverTarget = overItemId === itemDndId && activeItemId && activeItemId !== itemDndId
                            const showAbove = isOverTarget && activeIndex > index
                            const showBelow = isOverTarget && (activeIndex < index || activeIndex === -1)

                            return (
                                <div key={item.id} className="relative">
                                    {showAbove && <DropIndicatorLine />}
                                    <DraggableCheckRow item={item} onToggle={onToggle} onRename={onRenameItem} onDelete={onDeleteItem} renderItemSlot={renderItemSlot} />
                                    {showBelow && <DropIndicatorLine />}
                                </div>
                            )
                        })}
                        {isAddingItem && (
                            <InlineItemInput
                                onSubmit={(label: string) => onAddItem(section.id, label)}
                                onDismiss={onDismissAdd}
                            />
                        )}
                    </DroppableZone>
                </Accordion.Content>
            </Accordion.Item>
        </div>
    )
}

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
