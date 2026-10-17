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
        'flex h-control landscape:h-control-lg w-full min-w-0 items-center gap-2 rounded-lg px-3',
        'transition-colors has-[:disabled]:cursor-not-allowed',
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
                'has-aria-invalid:border-error has-aria-invalid:focus-within:ring-border-error/20',
                'has-[:disabled]:border-primary has-[:disabled]:bg-tertiary',
            ],
            ghost: [
                'bg-transparent border border-transparent shadow-none',
                'hover:bg-secondary focus-within:bg-primary focus-within:border-brand',
                'has-aria-invalid:border-error',
            ],
        }
    },
    defaultVariants: {
        state: 'inactive',
    },
})

export function Input({ className, icon, style = 'outline', state, ...props }: InputProps) {
    return (
        <div data-ui-control className={cn(inputVariants({ state: state, style: style }), className)}>
            {icon && <span className='*:size-4 text-quaternary'>{icon}</span>}
            <BaseInput className="w-full min-w-0 !p-0 bg-transparent text-primary focus:!outline-none focus-visible:!outline-0 !focus:ring-0 paragraph-sm !leading-none placeholder:text-quaternary disabled:text-quaternary" {...props} />
        </div>
    )
}
