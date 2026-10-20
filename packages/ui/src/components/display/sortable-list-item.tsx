import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@moc/utils/cn'
import type { HTMLAttributes, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, SyntheticEvent, TouchEvent as ReactTouchEvent } from 'react'
import { useSortableListContext } from './sortable-list-context'

type SortableListItemProps = {
    id: string
    'aria-label': string
    className?: string
    children: ReactNode
} & Omit<HTMLAttributes<HTMLDivElement>, 'id' | 'aria-label' | 'className' | 'children' | 'role' | 'tabIndex' | 'onMouseDown' | 'onTouchStart' | 'onKeyDown'>

const interactiveTargetSelector = 'button, input, select, textarea, a[href], [contenteditable="true"], [role="button"], [role="link"], [data-no-drag]'

function isInteractiveTarget(event: SyntheticEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return false
    const interactiveTarget = event.target.closest(interactiveTargetSelector)
    return interactiveTarget !== null && interactiveTarget !== event.currentTarget
}

export function SortableListItem({ id, 'aria-label': ariaLabel, className, children, ...props }: SortableListItemProps) {
    const { state: { disabled } } = useSortableListContext('SortableList.Item')
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled })

    function handleMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
        if (!isInteractiveTarget(event)) listeners?.onMouseDown?.(event)
    }

    function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
        if (!isInteractiveTarget(event)) listeners?.onTouchStart?.(event)
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (!isInteractiveTarget(event)) listeners?.onKeyDown?.(event)
    }

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={cn(disabled ? 'touch-pan-y' : 'cursor-grab touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand', className, isDragging && 'relative z-10 bg-primary opacity-90')}
            {...props}
            aria-label={ariaLabel}
            {...(disabled ? {} : { ...attributes, ...listeners, onMouseDown: handleMouseDown, onTouchStart: handleTouchStart, onKeyDown: handleKeyDown })}
        >
            {children}
        </div>
    )
}
