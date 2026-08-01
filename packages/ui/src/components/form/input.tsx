import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    "aria-label": string
    ref?: React.Ref<HTMLInputElement>
    icon?: ReactNode
    state?: 'active' | 'inactive'
    style?: 'outline' | 'ghost'
}

const inputVariants = cv({
    base: [
        'flex min-h-11 w-full min-w-0 items-center gap-1.5 has-[:disabled]:cursor-not-allowed md:min-h-0',
        'bg-primary has-[:disabled]:bg-disabled',
    ],
    variants: {
        state: {
            active: [''],
            inactive: [''],
        },
        style: {
            outline: [
                'py-2 px-3 ',
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

export function Input({ className, style = 'outline', state, ...props }: InputProps) {
    return (
        <div className={cn(inputVariants({ state: state, style: style }), className)}>
            {props.icon && <span className='*:size-4 text-tertiary'>{props.icon}</span>}
            <BaseInput className="w-full min-w-0 !p-0 focus:!outline-none focus-visible:!outline-0 !focus:ring-0 paragraph-sm !leading-none" {...props} />
        </div>
    )
}
