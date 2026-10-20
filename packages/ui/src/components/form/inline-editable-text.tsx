import { Input as BaseInput } from '@base-ui/react/input'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '@moc/utils/cn'
import { useInlineEditableText } from '../../hooks/use-inline-editable-text'

type InlineEditableTextProps = {
    value: string
    onSave: (value: string) => void
    className?: string
    placeholder?: string
    autoEdit?: boolean
    allowEmpty?: boolean
    disabled?: boolean
    'aria-label'?: string
}

export function InlineEditableText({ value, onSave, className, placeholder = 'Untitled', autoEdit, allowEmpty, disabled, 'aria-label': ariaLabel }: InlineEditableTextProps) {
    const { state, actions, meta: { inputRef } } = useInlineEditableText({ value, onSave, autoEdit, allowEmpty, disabled })

    if (state.isEditing) {
        return (
            <BaseInput
                ref={inputRef}
                type="text"
                value={state.draft}
                aria-label={ariaLabel}
                disabled={disabled}
                onChange={actions.handleChange}
                onBlur={actions.commit}
                onKeyDown={actions.handleKeyDown}
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
            aria-label={`Edit ${ariaLabel || value || placeholder}`}
            disabled={disabled}
            className={cn('block max-w-full cursor-text select-none truncate text-left', className)}
            onClick={actions.startEditing}
        >
            {value || placeholder}
        </BaseButton>
    )
}
