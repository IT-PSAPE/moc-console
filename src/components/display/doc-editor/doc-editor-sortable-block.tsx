import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/utils/cn'
import { DocEditorBlockMenu } from './doc-editor-block-menu'
import type { DocEditorBlock } from './doc-editor-types'

type DocEditorSortableBlockProps = {
    block: DocEditorBlock
    placeholder: string
    previousBlockId?: string
    nextBlockId?: string
    isMenuOpen: boolean
    registerContentRef: (blockId: string, element: HTMLDivElement | null) => void
    onUpdate: (blockId: string, content: string) => void
    onEnter: (blockId: string, afterContent: string) => void
    onDelete: (blockId: string) => void
    onMergeWithPrev: (blockId: string, text: string) => void
    onMenuToggle: (blockId: string) => void
    onMenuClose: () => void
    onMenuAction: (blockId: string, action: string) => void
    onAddBelow: (blockId: string) => void
    onFocusPrev: (blockId?: string) => void
    onFocusNext: (blockId?: string) => void
}

function getSelectionTextParts(element: HTMLDivElement) {
    const selection = window.getSelection()

    if (!selection?.rangeCount) {
        return { before: '', after: element.textContent || '' }
    }

    const range = selection.getRangeAt(0)
    const preRange = range.cloneRange()
    preRange.selectNodeContents(element)
    preRange.setEnd(range.startContainer, range.startOffset)

    const before = preRange.toString()
    const after = (element.textContent || '').slice(before.length)

    return { before, after }
}

function isSelectionAtStart(element: HTMLDivElement) {
    const selection = window.getSelection()
    if (!selection?.rangeCount) {
        return false
    }

    const range = selection.getRangeAt(0)
    if (!range.collapsed) {
        return false
    }

    if (range.startContainer === element) {
        return range.startOffset === 0
    }

    return range.startContainer === element.firstChild && range.startOffset === 0
}

export function DocEditorSortableBlock({
    block,
    placeholder,
    previousBlockId,
    nextBlockId,
    isMenuOpen,
    registerContentRef,
    onUpdate,
    onEnter,
    onDelete,
    onMergeWithPrev,
    onMenuToggle,
    onMenuClose,
    onMenuAction,
    onAddBelow,
    onFocusPrev,
    onFocusNext,
}: DocEditorSortableBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id })
    const contentElementRef = useRef<HTMLDivElement | null>(null)
    const [menuTriggerElement, setMenuTriggerElement] = useState<HTMLButtonElement | null>(null)

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    const setContentRef = useCallback((element: HTMLDivElement | null) => {
        contentElementRef.current = element
        registerContentRef(block.id, element)

        if (!element) {
            return
        }

        element.dataset.placeholder = placeholder
    }, [block.id, placeholder, registerContentRef])

    useEffect(() => {
        const element = contentElementRef.current
        if (!element) {
            return
        }

        // Don't overwrite content while the user is actively typing
        if (document.activeElement === element) {
            return
        }

        if (element.textContent !== block.content) {
            element.textContent = block.content
        }
    }, [block.content])

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter') {
            event.preventDefault()
            const { before, after } = getSelectionTextParts(event.currentTarget)
            event.currentTarget.textContent = before
            onUpdate(block.id, before)
            onEnter(block.id, after)
            return
        }

        if (event.key === 'Backspace') {
            if (!isSelectionAtStart(event.currentTarget)) {
                return
            }

            event.preventDefault()
            const text = event.currentTarget.textContent || ''
            if (text === '') {
                onDelete(block.id)
                return
            }

            onMergeWithPrev(block.id, text)
            return
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault()
            onFocusPrev(previousBlockId)
            return
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            onFocusNext(nextBlockId)
        }
    }

    function handleInput(event: FormEvent<HTMLDivElement>) {
        onUpdate(block.id, event.currentTarget.textContent || '')
    }

    function handleMenuAction(action: string) {
        onMenuClose()
        onMenuAction(block.id, action)
    }

    function handleAddBelow() {
        onAddBelow(block.id)
    }

    function handleMenuToggle() {
        onMenuToggle(block.id)
    }

    function handleButtonMouseDown(event: ReactMouseEvent<HTMLButtonElement>) {
        event.preventDefault()
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative flex items-start rounded-md',
                isDragging && 'opacity-25',
            )}
        >
            <div
                className={cn(
                    'absolute -left-13 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity',
                    isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
            >
                <button
                    type="button"
                    className="flex size-5.5 items-center justify-center rounded text-quaternary hover:bg-tertiary hover:text-secondary"
                    onMouseDown={handleButtonMouseDown}
                    onClick={handleAddBelow}
                >
                    <Plus size={12} />
                </button>

                <div className="relative">
                    <button
                        ref={setMenuTriggerElement}
                        type="button"
                        className="flex size-5.5 cursor-grab items-center justify-center rounded text-quaternary hover:bg-tertiary hover:text-secondary"
                        onClick={handleMenuToggle}
                        {...listeners}
                        {...attributes}
                    >
                        <GripVertical size={12} />
                    </button>
                    {isMenuOpen ? <DocEditorBlockMenu anchorElement={menuTriggerElement} onAction={handleMenuAction} onClose={onMenuClose} /> : null}
                </div>
            </div>

            <div
                ref={setContentRef}
                contentEditable
                suppressContentEditableWarning
                className="doc-block min-h-[1.7em] flex-1 break-words px-0.5 py-px paragraph-sm text-primary outline-none"
                data-placeholder={placeholder}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
            />
        </div>
    )
}
