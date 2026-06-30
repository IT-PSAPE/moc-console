import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Accordion } from '@moc/ui/components/display/accordion'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import type { ChecklistItem, ChecklistSection } from '@moc/types/cue-sheet'
import { Check, ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@moc/utils/cn'
import { Input } from '@moc/ui/components/form/input'
import { InlineEditableText } from '@moc/ui/components/form/inline-editable-text'

// ─── Drop indicator ─────────────────────────────────────────────────

export function DropIndicatorLine() {
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

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValue(e.target.value)
    }

    return { value, inputRef, handleSubmit, handleKeyDown, handleChange }
}

// ─── Inline item input (looks like a checklist row) ─────────────────

export function InlineItemInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
    const { value, inputRef, handleSubmit, handleKeyDown, handleChange } = useInlineInput(onSubmit, onDismiss)

    return (
        <div className="flex items-center gap-1 px-3 py-1.5">
            <span className="shrink-0 text-quaternary"><GripVertical className="size-4 invisible" /></span>
            <div className="flex items-center gap-3 flex-1">
                <div className="size-5 shrink-0 rounded border border-secondary bg-primary" />
                <Input
                    ref={inputRef}
                    style="ghost"
                    className="flex-1 label-sm text-primary placeholder:text-quaternary"
                    placeholder="Item label..."
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSubmit}
                />
            </div>
        </div>
    )
}

// ─── Inline section input (looks like a section header) ─────────────

export function InlineSectionInput({ onSubmit, onDismiss }: { onSubmit: (value: string) => void; onDismiss: () => void }) {
    const { value, inputRef, handleSubmit, handleKeyDown, handleChange } = useInlineInput(onSubmit, onDismiss)

    return (
        <div className="flex items-center border-b border-secondary">
            <div className="pl-3">
                <GripVertical className="size-4 text-quaternary invisible" />
            </div>
            <div className="flex items-center gap-3 px-2 pl-1.5 py-2.5 flex-1">
                <ChevronDown className="size-4 shrink-0 text-tertiary" />
                <Input
                    ref={inputRef}
                    style="ghost"
                    className="flex-1 label-sm text-primary placeholder:text-quaternary"
                    placeholder="Section name..."
                    value={value}
                    onChange={handleChange}
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

export function DraggableCheckRow({ item, onToggle, onRename, onDelete, renderItemSlot }: DraggableCheckRowProps) {
    const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({ id: `item:${item.id}` })
    const { setNodeRef: setDropRef } = useDroppable({ id: `item:${item.id}` })

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : undefined,
    }

    function handleToggle() {
        onToggle(item.id)
    }

    function handleRename(label: string) {
        onRename(item.id, label)
    }

    function handleDelete() {
        onDelete(item.id)
    }

    return (
        <div ref={setDropRef}>
            <div ref={setDragRef} style={style} className="group/item flex items-center gap-1 px-3 py-1.5 hover:bg-background-primary-hover transition-colors w-full">
                <span {...listeners} {...attributes} className="cursor-grab text-quaternary hover:text-secondary shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <GripVertical className="size-4" />
                </span>
                <div className="flex flex-1 items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        className="!border-0 !p-0 !bg-transparent"
                        onClick={handleToggle}
                    >
                        <span
                            className={cn(
                                'size-5 shrink-0 rounded border flex items-center justify-center transition-colors',
                                item.checked ? 'bg-brand_solid border-transparent' : 'border-secondary bg-primary',
                            )}
                        >
                            {item.checked && <Check className="size-3.5 text-white" />}
                        </span>
                    </Button>
                    <InlineEditableText
                        value={item.label}
                        onSave={handleRename}
                        className={cn('label-sm min-w-0 flex-1', item.checked && 'line-through text-tertiary')}
                    />
                </div>
                {renderItemSlot && (
                    <div className="shrink-0">
                        {renderItemSlot(item)}
                    </div>
                )}
                <Button.Icon
                    aria-label="Delete item"
                    variant="ghost"
                    icon={<Trash2 />}
                    className="shrink-0 !p-1 text-quaternary opacity-0 transition-opacity hover:text-secondary group-hover/item:opacity-100"
                    onClick={handleDelete}
                />
            </div>
        </div>
    )
}

// ─── Ghost overlays for DragOverlay ─────────────────────────────────

export function CheckRowGhost({ item }: { item: ChecklistItem }) {
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

export function SectionGhost({ section }: { section: ChecklistSection }) {
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

export function DroppableZone({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
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

export function SectionRow({ section, onToggle, onAddItem, onRenameItem, onDeleteItem, onRenameSection, onDeleteSection, activeItemId, overItemId, isAddingItem, onRequestAddItem, onDismissAdd, renderItemSlot }: SectionRowProps) {
    const { setNodeRef: setSectionDropRef } = useDroppable({ id: `section:${section.id}` })
    const checkedCount = section.items.filter((i) => i.checked).length

    const activeIndex = activeItemId
        ? section.items.findIndex((i) => `item:${i.id}` === activeItemId)
        : -1

    function handleRenameSection(name: string) {
        onRenameSection(section.id, name)
    }

    function handleAddClick(e: React.MouseEvent) {
        e.stopPropagation()
        onRequestAddItem(section.id)
    }

    function handleDeleteSectionClick(e: React.MouseEvent) {
        e.stopPropagation()
        onDeleteSection(section.id)
    }

    function handleAddItemSubmit(label: string) {
        onAddItem(section.id, label)
    }

    return (
        <div ref={setSectionDropRef}>
            <Accordion.Item value={section.id} className="border-b border-secondary">
                <div className="group/section flex items-center">
                    <div className="pl-3">
                        <DraggableSectionHandle sectionId={section.id} />
                    </div>
                    <Accordion.Trigger className="flex items-center gap-3 px-2 pl-1.5 py-2.5 hover:bg-background-primary-hover transition-colors">
                        <ChevronDown className="size-4 shrink-0 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
                        <InlineEditableText value={section.name} onSave={handleRenameSection} className="label-sm text-left" />
                        <Paragraph.xs className="text-tertiary shrink-0">{checkedCount}/{section.items.length}</Paragraph.xs>
                    </Accordion.Trigger>
                    <Button.Icon
                        aria-label="Add item"
                        variant="ghost"
                        icon={<Plus />}
                        className="shrink-0 mr-2 !p-1 text-tertiary hover:text-secondary"
                        onClick={handleAddClick}
                    />
                    <Button.Icon
                        aria-label="Delete section"
                        variant="ghost"
                        icon={<Trash2 />}
                        className="shrink-0 mr-2 !p-1 text-quaternary hover:text-secondary"
                        onClick={handleDeleteSectionClick}
                    />
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
                                onSubmit={handleAddItemSubmit}
                                onDismiss={onDismissAdd}
                            />
                        )}
                    </DroppableZone>
                </Accordion.Content>
            </Accordion.Item>
        </div>
    )
}
