import { cn } from '@/utils/cn'
import { useEffect, useRef, type HTMLAttributes } from 'react'
import { useModal } from './modal-context'

type ModalPanelProps = HTMLAttributes<HTMLDivElement>

export function ModalPanel({ children, className, ...props }: ModalPanelProps) {
    const panelRef = useRef<HTMLDivElement | null>(null)
    const { state, meta } = useModal()

    useEffect(() => {
        if (!state.isOpen || !state.isTopmost) {
            return
        }

        panelRef.current?.focus()
    }, [state.isOpen, state.isTopmost])

    return (
        <div
            ref={panelRef}
            aria-describedby={meta.descriptionId}
            aria-labelledby={meta.titleId}
            aria-modal="true"
            className={cn('pointer-events-auto flex w-full max-w-sm flex-col rounded-xl border border-secondary bg-primary',
                className,
            )}
            role="dialog"
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
}
