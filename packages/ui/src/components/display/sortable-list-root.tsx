import { DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import { useSortableList } from '../../hooks/use-sortable-list'
import { SortableListContext } from './sortable-list-context'

type SortableListRootProps = {
    items: string[]
    onReorder: (activeId: string, overId: string) => void
    disabled?: boolean
    children: ReactNode
}

export function SortableListRoot({ items, onReorder, disabled = false, children }: SortableListRootProps) {
    const { sensors, collisionDetection, handleDragEnd, accessibility } = useSortableList({ items, onReorder })
    const contextValue = { state: { disabled }, actions: {}, meta: {} }

    return (
        <SortableListContext.Provider value={contextValue}>
            <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={handleDragEnd} accessibility={accessibility}>
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                    {children}
                </SortableContext>
            </DndContext>
        </SortableListContext.Provider>
    )
}
