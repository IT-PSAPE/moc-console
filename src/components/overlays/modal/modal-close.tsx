import type { HTMLAttributes, MouseEvent } from 'react'
import { useModal } from './modal-context'


export function ModalClose({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement> ) {
    const { actions } = useModal()

    function handleClick(event: MouseEvent<HTMLSpanElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        actions.close()
    }

    return (
        <span onClick={handleClick} {...props} role="button">
            {children}
        </span>
    )
}
