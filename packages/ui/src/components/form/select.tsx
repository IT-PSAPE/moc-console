import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
    ref?: React.Ref<HTMLSelectElement>
    state?: 'active' | 'inactive'
    style?: 'outline' | 'ghost'
}

const selectVariants = cv({
    base: [
        'relative flex items-center gap-1.5 has-[:disabled]:cursor-not-allowed',
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
                'focus-within:ring-3 focus-within:ring-border-brand/10',
            ],
            ghost: [''],
        },
    },
    defaultVariants: {
        state: 'inactive',
    },
})

export function Select({ className, style = 'outline', state, children, ...props }: SelectProps) {
    return (
        <div className={cn(selectVariants({ state, style }), className)}>
            <select
                className="w-full appearance-none bg-transparent !p-0 pr-5 focus:!outline-none focus-visible:!outline-0 paragraph-sm !leading-none"
                {...props}
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 size-4 text-tertiary" />
        </div>
    )
}
