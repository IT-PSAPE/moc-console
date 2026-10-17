import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import type { TextareaHTMLAttributes } from "react";
import { useAutoSizeTextArea } from "../../hooks/use-auto-size-text-area";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    "aria-label": string
    ref?: React.Ref<HTMLTextAreaElement>
    state?: 'active' | 'inactive'
    style?: 'outline' | 'ghost'
}

const textAreaVariants = cv({
    base: [
        'w-full min-h-[4.5rem] resize-none overflow-hidden rounded-lg px-3 py-2',
        'text-primary paragraph-sm placeholder:text-quaternary transition-colors',
        'disabled:cursor-not-allowed disabled:bg-tertiary disabled:text-quaternary',
        'focus-within:outline-none',
        'aria-invalid:border-error aria-invalid:focus-within:ring-border-error/20',
    ],
    variants: {
        state: {
            active: [''],
            inactive: [''],
        },
        style: {
            outline: [
                'bg-primary border border-primary shadow-xs',
                'focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/20',
                'disabled:border-primary',
            ],
            ghost: [
                'bg-transparent border border-transparent shadow-none',
                'hover:bg-secondary focus-within:bg-primary focus-within:border-brand',
            ],
        },
    },
    defaultVariants: {
        state: 'inactive',
    },
})

export function TextArea({ className, defaultValue, onInput, ref, style = 'outline', state, value, ...props }: TextAreaProps) {
    const autoSize = useAutoSizeTextArea({ onInput, ref, value: value ?? defaultValue })

    return (
        <textarea
            ref={autoSize.setRef}
            className={cn(textAreaVariants({ state, style }), className)}
            defaultValue={defaultValue}
            onInput={autoSize.handleInput}
            value={value}
            {...props}
        />
    )
}
