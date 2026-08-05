import { useCallback, useLayoutEffect, useRef, type FormEventHandler, type Ref } from 'react'

type UseAutoSizeTextAreaOptions = {
    onInput?: FormEventHandler<HTMLTextAreaElement>
    ref?: Ref<HTMLTextAreaElement>
    value?: string | number | readonly string[]
}

function assignRef(ref: Ref<HTMLTextAreaElement> | undefined, element: HTMLTextAreaElement | null) {
    if (typeof ref === 'function') {
        ref(element)
        return
    }

    if (ref) ref.current = element
}

export function useAutoSizeTextArea({ onInput, ref, value }: UseAutoSizeTextAreaOptions) {
    const elementRef = useRef<HTMLTextAreaElement | null>(null)

    const resize = useCallback(() => {
        const element = elementRef.current
        if (!element) return

        element.style.height = 'auto'
        element.style.height = `${element.scrollHeight}px`
    }, [])

    const setRef = useCallback((element: HTMLTextAreaElement | null) => {
        elementRef.current = element
        assignRef(ref, element)
    }, [ref])

    const handleInput = useCallback<FormEventHandler<HTMLTextAreaElement>>((event) => {
        resize()
        onInput?.(event)
    }, [onInput, resize])

    useLayoutEffect(() => {
        resize()
    }, [resize, value])

    return { handleInput, setRef }
}
