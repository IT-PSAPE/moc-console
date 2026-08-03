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
        'w-full resize-none overflow-hidden bg-secondary disabled:cursor-not-allowed disabled:bg-disabled',
        'paragraph-sm',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-border-brand/10',
    ],
    variants: {
        state: {
            active: [''],
            inactive: [''],
        },
        style: {
            outline: [
                'py-2 px-3',
                'rounded-lg border border-secondary focus-visible:border-brand disabled:border-disabled',
            ],
            ghost: ['rounded-md px-2 py-1.5'],
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
