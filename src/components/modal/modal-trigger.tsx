import type { HTMLAttributes, MouseEvent } from 'react'
import { useModal } from './modal-context'

export function ModalTrigger({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useModal()

    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        actions.open()
    }

    return (
        <span onClick={handleClick} {...props} role="button">
            {children}
        </span>
    )
}
