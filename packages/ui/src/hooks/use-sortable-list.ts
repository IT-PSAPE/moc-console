import { useCallback } from 'react'
import {
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { DndContextProps } from '@dnd-kit/core'

type UseSortableListProps = {
    items: string[]
    onReorder: (activeId: string, overId: string) => void
}

export function useSortableList({ items, onReorder }: UseSortableListProps) {
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        if (event.over && event.active.id !== event.over.id) {
            onReorder(String(event.active.id), String(event.over.id))
        }
    }, [onReorder])

    const getPosition = useCallback((id: string) => {
        const index = items.indexOf(id)
        return index < 0 ? undefined : index + 1
    }, [items])

    const accessibility: DndContextProps['accessibility'] = {
        announcements: {
            onDragStart({ active }) {
                const position = getPosition(String(active.id))
                return position ? `Picked up item ${position} of ${items.length}.` : 'Picked up item.'
            },
            onDragOver({ active, over }) {
                if (!over) return `Item ${String(active.id)} is no longer over a target.`
                const position = getPosition(String(over.id))
                return position ? `Item moved to position ${position} of ${items.length}.` : 'Item moved.'
            },
            onDragEnd({ over }) {
                if (!over) return 'Item was dropped.'
                const position = getPosition(String(over.id))
                return position ? `Item dropped at position ${position} of ${items.length}.` : 'Item was dropped.'
            },
            onDragCancel() {
                return 'Dragging was cancelled.'
            },
        },
        screenReaderInstructions: {
            draggable: 'To pick up an item, press Space. While dragging, use the arrow keys to move it, press Space to drop it, or press Escape to cancel. With a mouse or touch, press and hold a row briefly to pick it up.',
        },
    }

    return { sensors, collisionDetection: closestCenter, handleDragEnd, accessibility }
}
