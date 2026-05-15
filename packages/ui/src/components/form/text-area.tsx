import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import type { TextareaHTMLAttributes } from "react";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    ref?: React.Ref<HTMLTextAreaElement>
    state?: 'active' | 'inactive'
    style?: 'outline' | 'ghost'
    resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

const textAreaVariants = cv({
    base: [
        'w-full bg-primary disabled:cursor-not-allowed disabled:bg-disabled',
        'paragraph-sm',
        'focus:outline-none',
    ],
    variants: {
        state: {
            active: [''],
            inactive: [''],
        },
        style: {
            outline: [
                'py-2 px-3',
                'rounded-lg border border-secondary focus:border-brand disabled:border-disabled',
                'focus:ring-3 focus:ring-border-brand/10',
            ],
            ghost: [''],
        },
        resize: {
            none: ['resize-none'],
            vertical: ['resize-y'],
            horizontal: ['resize-x'],
            both: ['resize'],
        },
    },
    defaultVariants: {
        state: 'inactive',
        resize: 'none',
    },
})

export function TextArea({ className, style = 'outline', state, resize, ...props }: TextAreaProps) {
    return (
        <textarea
            className={cn(textAreaVariants({ state, style, resize }), className)}
            {...props}
        />
    )
}
