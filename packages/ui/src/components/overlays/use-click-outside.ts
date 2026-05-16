import { useEffect, useRef } from 'react'

export function useClickOutside(elements: Array<HTMLElement | null>, isActive: boolean, handler: () => void) {
    const handlerRef = useRef(handler)

    useEffect(() => {
        handlerRef.current = handler
    }, [handler])

    useEffect(() => {
        if (!isActive) {
            return
        }

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node

            const isOutside = elements.every((element) => {
                return !element || !element.contains(target)
            })

            if (isOutside) {
                handlerRef.current()
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [elements, isActive])
}
