import { cn } from '@/utils/cn'
import type { HTMLAttributes, MouseEvent } from 'react'
import { useModal } from './modal-context'

type ModalBackdropProps = HTMLAttributes<HTMLDivElement>

export function ModalBackdrop({ className, onClick, ...props }: ModalBackdropProps) {
    const { actions, meta } = useModal()

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        onClick?.(event)

        if (event.defaultPrevented || !meta.closeOnBackdropClick) {
            return
        }

        actions.close()
    }

    return (
        <div
            aria-hidden="true"
            className={cn('pointer-events-auto fixed inset-0 bg-black/56', className)}
            onClick={handleClick}
            {...props}
        />
    )
}
