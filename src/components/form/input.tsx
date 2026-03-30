import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";
import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    icon?: ReactNode
    state?: 'active' | 'inactive'
}

const inputVariants = cv({
    base: [
        'flex items-center gap-1.5 py-2 px-3 has-[:disabled]:cursor-not-allowed',
        'bg-primary has-[:disabled]:bg-disabled',
        'rounded-lg border border-secondary focus-within:border-brand has-[:disabled]:border-disabled',
        'focus-within:ring-3 focus-within:ring-border-brand/10'
    ],
    variants: {
        state: {
            active: [''],
            inactive: [''],
        },
    },
    defaultVariants: {
        state: 'inactive',
    },
})

export function Input({ className, ...props }: InputProps) {
    return (
        <div className={cn(inputVariants({ state: 'active' }), className)}>
            {props.icon && <span className='*:size-4 text-tertiary'>{props.icon}</span>}
            <input className="w-full !p-0 focus:!outline-none focus-visible:!outline-0 !focus:ring-0 paragraph-sm !leading-none" {...props} />
        </div>
    )
}
