import { useRef, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'

export type UseComposerOptions = {
    value: string
    onValueChange: (value: string) => void
    onSubmit: () => void | Promise<void>
    disabled?: boolean
    pending?: boolean
    maxLength?: number
}

export function useComposer({ value, onValueChange, onSubmit, disabled = false, pending = false, maxLength }: UseComposerOptions) {
    const submitting = useRef(false)
    const canSubmit = !disabled && !pending && Boolean(value.trim()) && (maxLength === undefined || value.length <= maxLength)

    function changeValue(event: ChangeEvent<HTMLTextAreaElement>): void {
        onValueChange(event.target.value)
    }

    async function submit(): Promise<void> {
        if (!canSubmit || submitting.current) return
        submitting.current = true
        try {
            await onSubmit()
        } finally {
            submitting.current = false
        }
    }

    function submitForm(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault()
        void submit()
    }

    function keyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
        if (event.key !== 'Enter' || (!event.ctrlKey && !event.metaKey) || event.nativeEvent.isComposing) return
        event.preventDefault()
        void submit()
    }

    return {
        state: { value, disabled, pending, canSubmit },
        actions: { changeValue, submitForm, keyDown },
        meta: { maxLength },
    }
}
