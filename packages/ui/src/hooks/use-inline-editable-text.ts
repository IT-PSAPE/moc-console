import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

type InlineEditableTextOptions = {
    value: string
    onSave: (value: string) => void
    autoEdit?: boolean
    allowEmpty?: boolean
    disabled?: boolean
}

export function useInlineEditableText({ value, onSave, autoEdit, allowEmpty = false, disabled = false }: InlineEditableTextOptions) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)
    const hasAutoEdited = useRef(false)

    useEffect(() => { setDraft(value) }, [value])

    useEffect(() => {
        if (autoEdit && !disabled && !hasAutoEdited.current) {
            hasAutoEdited.current = true
            setIsEditing(true)
        }
    }, [autoEdit, disabled])

    useEffect(() => {
        if (!isEditing) return
        const frame = requestAnimationFrame(() => {
            inputRef.current?.focus()
            inputRef.current?.select()
        })
        return () => cancelAnimationFrame(frame)
    }, [isEditing])

    const commit = useCallback(() => {
        const trimmed = draft.trim()
        if (!disabled && (allowEmpty || trimmed) && trimmed !== value) onSave(trimmed)
        else setDraft(value)
        setIsEditing(false)
    }, [allowEmpty, disabled, draft, onSave, value])

    function handleKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault()
            commit()
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            setDraft(value)
            setIsEditing(false)
        }
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>): void {
        setDraft(event.target.value)
    }

    function startEditing(): void {
        if (!disabled) setIsEditing(true)
    }

    return { state: { draft, isEditing }, actions: { commit, handleChange, handleKeyDown, startEditing }, meta: { inputRef } }
}
