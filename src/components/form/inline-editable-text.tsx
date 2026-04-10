import { cn } from '@/utils/cn'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'

type InlineEditableTextProps = {
    value: string
    onSave: (value: string) => void
    className?: string
    placeholder?: string
}

export function InlineEditableText({ value, onSave, className, placeholder = 'Untitled' }: InlineEditableTextProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDraft(value)
    }, [value])

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

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
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
        <span
            className={cn('cursor-text select-none truncate', className)}
            onDoubleClick={() => setIsEditing(true)}
            role="textbox"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditing(true)
            }}
        >
            {value || placeholder}
        </span>
    )
}
