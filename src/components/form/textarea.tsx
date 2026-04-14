import { cn } from "@/utils/cn"
import { cv } from "@/utils/cv"
import type { TextareaHTMLAttributes } from "react"

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    ref?: React.Ref<HTMLTextAreaElement>
    state?: 'active' | 'inactive'
    style?: 'outline' | 'ghost'
}

const textareaVariants = cv({
    base: [
        'flex has-[:disabled]:cursor-not-allowed',
        'bg-primary has-[:disabled]:bg-disabled',
    ],
    variants: {
        state: {
            active: [''],
            inactive: [''],
        },
        style: {
            outline: [
                'py-2 px-3',
                'rounded-lg border border-secondary focus-within:border-brand has-[:disabled]:border-disabled',
                'focus-within:ring-3 focus-within:ring-border-brand/10'
            ],
            ghost: [''],
        }
    },
    defaultVariants: {
        state: 'inactive',
    },
})

export function Textarea({ className, style = 'outline', state, ...props }: TextareaProps) {
    return (
        <div className={cn(textareaVariants({ state, style }), className)}>
            <textarea className="w-full min-h-20 resize-y !p-0 focus:!outline-none focus-visible:!outline-0 !focus:ring-0 paragraph-sm !leading-snug" {...props} />
        </div>
    )
}
