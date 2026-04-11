import { useCallback, useEffect, useRef, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { DocEditorSortableBlock } from './doc-editor-sortable-block'
import type { DocEditorBlock } from './doc-editor-types'
import { createDocEditorBlock, deserializeDocEditorValue, moveDocEditorBlock, normalizeDocEditorValue, serializeDocEditorBlocks } from './doc-editor-utils'

type DocEditorProps = {
    value?: string
    onChange?: (value: string) => void
    placeholder?: string
    className?: string
}

function focusEditorPosition(element: HTMLDivElement | null, collapseToEnd: boolean) {
    if (!element) {
        return
    }

    element.focus()

    try {
        const range = document.createRange()
        if (collapseToEnd) {
            range.selectNodeContents(element)
            range.collapse(false)
        } else {
            range.setStart(element.firstChild ?? element, 0)
            range.collapse(true)
        }

        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
    } catch {
        // No-op when the DOM selection cannot be updated.
    }
}

export function DocEditor({ value, onChange, placeholder = 'Type something...', className }: DocEditorProps) {
    const [blocks, setBlocks] = useState<DocEditorBlock[]>(() => deserializeDocEditorValue(value))
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const contentRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const blocksRef = useRef(blocks)
    const serializedValueRef = useRef(serializeDocEditorBlocks(blocks))
    const pendingEchoesRef = useRef(new Set<string>())
    const lastEmittedRef = useRef<string | undefined>(undefined)

    useEffect(() => {
        blocksRef.current = blocks
        serializedValueRef.current = serializeDocEditorBlocks(blocks)
    }, [blocks])

    useEffect(() => {
        const incomingValue = normalizeDocEditorValue(value)

        // If this value was emitted by our own onChange, it's an echo — skip it
        if (pendingEchoesRef.current.has(incomingValue)) {
            pendingEchoesRef.current.delete(incomingValue)
            return
        }

        // Genuine external update — clear echo tracking and apply
        pendingEchoesRef.current.clear()

        if (incomingValue === serializedValueRef.current) {
            return
        }

        setBlocks(deserializeDocEditorValue(value))
    }, [value])

    useEffect(() => {
        const serialized = serializedValueRef.current
        const incomingValue = normalizeDocEditorValue(value)

        if (serialized !== incomingValue && serialized !== lastEmittedRef.current) {
            lastEmittedRef.current = serialized
            pendingEchoesRef.current.add(serialized)
            onChange?.(serialized)
        }
    }, [blocks, onChange, value])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    )

    const focusEnd = useCallback((id: string) => {
        requestAnimationFrame(() => {
            focusEditorPosition(contentRefs.current[id], true)
        })
    }, [])

    const focusStart = useCallback((id: string) => {
        requestAnimationFrame(() => {
            focusEditorPosition(contentRefs.current[id], false)
        })
    }, [])

    const addBlockAfter = useCallback((afterId: string, content = '') => {
        const newBlock = createDocEditorBlock(content)

        setBlocks((previousBlocks) => {
            const nextBlocks = [...previousBlocks]
            const insertIndex = nextBlocks.findIndex((block) => block.id === afterId)
            nextBlocks.splice(insertIndex + 1, 0, newBlock)
            return nextBlocks
        })

        requestAnimationFrame(() => {
            const element = contentRefs.current[newBlock.id]
            if (element && content) {
                element.textContent = content
            }

            focusEditorPosition(contentRefs.current[newBlock.id], false)
        })
    }, [])

    const deleteBlock = useCallback((id: string) => {
        const currentBlocks = blocksRef.current
        if (currentBlocks.length <= 1) {
            return
        }

        const blockIndex = currentBlocks.findIndex((block) => block.id === id)
        const previousBlock = currentBlocks[blockIndex - 1]
        setBlocks((previousBlocks) => previousBlocks.filter((block) => block.id !== id))

        if (previousBlock) {
            focusEnd(previousBlock.id)
        }
    }, [focusEnd])

    const updateBlock = useCallback((id: string, content: string) => {
        setBlocks((previousBlocks) => previousBlocks.map((block) => block.id === id ? { ...block, content } : block))
    }, [])

    const mergeWithPreviousBlock = useCallback((id: string, text: string) => {
        const currentBlocks = blocksRef.current
        const blockIndex = currentBlocks.findIndex((block) => block.id === id)

        if (blockIndex <= 0) {
            return
        }

        const previousBlock = currentBlocks[blockIndex - 1]
        const mergePoint = previousBlock.content.length

        setBlocks((previousBlocks) => previousBlocks
            .map((block) => block.id === previousBlock.id ? { ...block, content: block.content + text } : block)
            .filter((block) => block.id !== id))

        requestAnimationFrame(() => {
            const element = contentRefs.current[previousBlock.id]
            if (!element) {
                return
            }

            element.textContent = previousBlock.content + text
            element.focus()

            try {
                const textNode = element.firstChild
                if (!textNode) {
                    return
                }

                const range = document.createRange()
                range.setStart(textNode, mergePoint)
                range.collapse(true)
                window.getSelection()?.removeAllRanges()
                window.getSelection()?.addRange(range)
            } catch {
                // No-op when the DOM selection cannot be updated.
            }
        })
    }, [])

    const handleMenuAction = useCallback((blockId: string, action: string) => {
        if (action === 'delete') {
            deleteBlock(blockId)
            return
        }

        if (action === 'duplicate') {
            const block = blocksRef.current.find((candidate) => candidate.id === blockId)
            if (block) {
                addBlockAfter(blockId, block.content)
            }
            return
        }

        if (action === 'move-top' || action === 'move-bottom') {
            setBlocks((previousBlocks) => {
                const blockIndex = previousBlocks.findIndex((block) => block.id === blockId)
                if (blockIndex === -1) {
                    return previousBlocks
                }

                const nextBlocks = [...previousBlocks]
                const [block] = nextBlocks.splice(blockIndex, 1)
                return action === 'move-top' ? [block, ...nextBlocks] : [...nextBlocks, block]
            })
        }
    }, [addBlockAfter, deleteBlock])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setOpenMenuId(null)

        const { active, over } = event
        if (!over || active.id === over.id) {
            return
        }

        setBlocks((previousBlocks) => {
            const oldIndex = previousBlocks.findIndex((block) => block.id === active.id)
            const newIndex = previousBlocks.findIndex((block) => block.id === over.id)
            return moveDocEditorBlock(previousBlocks, oldIndex, newIndex)
        })
    }, [])

    const handleCanvasClick = useCallback(() => {
        const lastBlock = blocksRef.current[blocksRef.current.length - 1]
        if (!lastBlock) {
            return
        }

        if (!lastBlock.content) {
            focusEnd(lastBlock.id)
            return
        }

        addBlockAfter(lastBlock.id)
    }, [addBlockAfter, focusEnd])

    const registerContentRef = useCallback((blockId: string, element: HTMLDivElement | null) => {
        contentRefs.current[blockId] = element
    }, [])

    const handleBlockUpdate = useCallback((blockId: string, content: string) => {
        updateBlock(blockId, content)
    }, [updateBlock])

    const handleBlockEnter = useCallback((blockId: string, content: string) => {
        addBlockAfter(blockId, content)
    }, [addBlockAfter])

    const handleBlockDelete = useCallback((blockId: string) => {
        deleteBlock(blockId)
    }, [deleteBlock])

    const handleBlockMergeWithPrevious = useCallback((blockId: string, text: string) => {
        mergeWithPreviousBlock(blockId, text)
    }, [mergeWithPreviousBlock])

    const handleBlockMenuToggle = useCallback((blockId: string) => {
        setOpenMenuId((previousOpenId) => previousOpenId === blockId ? null : blockId)
    }, [])

    const handleBlockMenuClose = useCallback(() => {
        setOpenMenuId(null)
    }, [])

    const handleBlockAddBelow = useCallback((blockId: string) => {
        addBlockAfter(blockId)
    }, [addBlockAfter])

    const handleFocusPreviousBlock = useCallback((blockId?: string) => {
        if (blockId) {
            focusEnd(blockId)
        }
    }, [focusEnd])

    const handleFocusNextBlock = useCallback((blockId?: string) => {
        if (blockId) {
            focusStart(blockId)
        }
    }, [focusStart])

    function renderBlock(block: DocEditorBlock, index: number) {
        const previousBlock = blocks[index - 1]
        const nextBlock = blocks[index + 1]

        return (
            <DocEditorSortableBlock
                key={block.id}
                block={block}
                placeholder={placeholder}
                previousBlockId={previousBlock?.id}
                nextBlockId={nextBlock?.id}
                isMenuOpen={openMenuId === block.id}
                registerContentRef={registerContentRef}
                onUpdate={handleBlockUpdate}
                onEnter={handleBlockEnter}
                onDelete={handleBlockDelete}
                onMergeWithPrev={handleBlockMergeWithPrevious}
                onMenuToggle={handleBlockMenuToggle}
                onMenuClose={handleBlockMenuClose}
                onMenuAction={handleMenuAction}
                onAddBelow={handleBlockAddBelow}
                onFocusPrev={handleFocusPreviousBlock}
                onFocusNext={handleFocusNextBlock}
            />
        )
    }

    return (
        <div className={className}>
            <div className="w-full max-w-[680px]">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                        {blocks.map(renderBlock)}
                    </SortableContext>
                </DndContext>

                <div className="min-h-20 cursor-text pl-13 pt-1" onClick={handleCanvasClick} />
            </div>
        </div>
    )
}
