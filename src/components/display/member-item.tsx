import { cv } from "@/utils/cv";
import { Label, Paragraph } from "./text";
import { cn } from "@/utils/cn";

type MemberItemProps = {
    name: string;
    surname: string;
    className?: string;
    duty?: string;
    disabled?: boolean;
    selectable?: boolean;
    children?: React.ReactNode;
    size?: "sm" | "md" | "bg";
}

const variants = cv({
    base: [
        'w-full flex items-center rounded-lg py-1 text-left',
    ],
    variants: {
        selectable: {
            true: ['px-2 hover:bg-secondary transition-colors cursor-pointer'],
            false: [''],
        },
        disabled: {
            true: ['opacity-50 !cursor-not-allowed hover:!bg-transparent'],
            false: [''],
        },
        size: {
            sm: ['py-0.5 text-sm space-x-1 !text-xs'],
            md: ['py-1 text-md space-x-2 !text-sm'],
            bg: ['py-1 text-md space-x-2 !text-sm'],
        }
    },
    defaultVariants: {
        disabled: 'false',
        selectable: 'false',
        size: 'md',
    },
})

const avatarAariants = cv({
    base: [
        'block  shrink-0 rounded-full bg-brand_primary flex items-center justify-center',
    ],
    variants: {
        size: {
            sm: ['size-6'],
            md: ['size-8'],
            bg: ['size-10'],
        },
    },
    defaultVariants: {
        size: 'md',
    },
})



export function MemberItem({ name, surname, duty, disabled, selectable, className, children, size }: MemberItemProps) {
    return (
        <div className={cn(variants({ disabled: disabled ? 'true' : 'false', selectable: selectable ? 'true' : 'false', size: size}), className)}>
            <div className={cn(avatarAariants({ size: size }))}>
                <Label.xs className="text-brand_secondary text-center">{name[0]}{surname[0]}</Label.xs>
            </div>
            <div className="flex-1 min-w-0">
                <Label.sm className="!text-[length:inherit]" >{name} {surname}</Label.sm>
                {duty && <Paragraph.xs className="text-quaternary truncate">{duty}</Paragraph.xs>}
            </div>
            <span className="ml-auto">{children}</span>
        </div>
    )
}