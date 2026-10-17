import { cv } from "@moc/utils/cv";
import { cn } from "@moc/utils/cn";

type BadgeProps = {
    icon?: React.ReactNode;
    label?: string;
    variant?: 'filled' | 'outline';
    color?: 'yellow' | 'green' | 'blue' | 'gray' | 'purple' | 'red' | 'orange';
    /** Optional leading status dot instead of an icon (size-1.5, uses the current text colour). */
    dot?: boolean;
    className?: string
}

// `color` is declared before `variant` so that, after the final `cn()` merge,
// `outline`'s neutral bg/border/text always wins over a tone's bg/border/text
// for the same utility group — no `!important` needed.
const variants = cv({
    base: [
        'inline-flex w-fit shrink-0 items-center gap-1 h-[22px] px-1.5 rounded-md border text-xs font-medium leading-4 whitespace-nowrap',
    ],
    variants: {
        color: {
            // Border is always the tone's own text colour at 15% opacity
            // (`border-current/15`), so it tints to match without needing a
            // dedicated border token per tone.
            yellow: ['bg-utility-yellow-50 text-utility-yellow-700 border-current/15'],
            green: ['bg-success text-success border-current/15'],
            red: ['bg-error text-error border-current/15'],
            blue: ['bg-utility-blue-50 text-utility-blue-700 border-current/15'],
            gray: ['bg-secondary text-secondary border-current/15'],
            purple: ['bg-utility-purple-50 text-utility-purple-700 border-current/15'],
            orange: ['bg-warning text-warning border-current/15'],
        },
        variant: {
            filled: [],
            outline: ['bg-primary border-secondary text-tertiary'],
        },
    },
    defaultVariants: {
        variant: 'filled',
        color: 'gray',
    },
})

export function Badge({ icon, variant, color, label, dot, className }: BadgeProps) {
    return (
        <div className={cn(variants({ variant, color }), className)}>
            {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}
            {icon && <span className="*:size-3.5 shrink-0 text-inherit">{icon}</span>}
            {label && <span className="truncate text-inherit">{label}</span>}
        </div>
    )
}
