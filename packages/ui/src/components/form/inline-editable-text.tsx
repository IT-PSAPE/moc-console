import { Input as BaseInput } from '@base-ui/react/input'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '@moc/utils/cn'
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'

type InlineEditableTextProps = {
    value: string
    onSave: (value: string) => void
    className?: string
    placeholder?: string
    autoEdit?: boolean
}

export function InlineEditableText({ value, onSave, className, placeholder = 'Untitled', autoEdit }: InlineEditableTextProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)
    const hasAutoEdited = useRef(false)

    useEffect(() => {
        setDraft(value)
    }, [value])

    useEffect(() => {
        if (autoEdit && !hasAutoEdited.current) {
            hasAutoEdited.current = true
            setIsEditing(true)
        }
    }, [autoEdit])

    useEffect(() => {
        if (isEditing) {
            requestAnimationFrame(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            })
        }
    }, [isEditing])

    const commit = useCallback(() => {
        const trimmed = draft.trim()
        if (trimmed && trimmed !== value) {
            onSave(trimmed)
        } else {
            setDraft(value)
        }
        setIsEditing(false)
    }, [draft, value, onSave])

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            commit()
        }
        if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(value)
            setIsEditing(false)
        }
    }, [commit, value])

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        setDraft(event.target.value)
    }

    function handleStartEditing() {
        setIsEditing(true)
    }

    if (isEditing) {
        return (
            <BaseInput
                ref={inputRef}
                type="text"
                value={draft}
                onChange={handleChange}
                onBlur={commit}
                onKeyDown={handleKeyDown}
                className={cn(
                    'bg-transparent border-none outline-none p-0 m-0 w-full',
                    'font-[inherit] text-[inherit] leading-[inherit]',
                    className,
                )}
                placeholder={placeholder}
            />
        )
    }

    return (
        <BaseButton
            type="button"
            aria-label={`Edit ${value || placeholder}`}
            className={cn('block max-w-full cursor-text select-none truncate text-left', className)}
            onClick={handleStartEditing}
        >
            {value || placeholder}
        </BaseButton>
    )
}
