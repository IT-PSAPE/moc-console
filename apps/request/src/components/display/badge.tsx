import { cv } from "@/utils/cv";
import { Label } from "./text";
import { cn } from "@/utils/cn";


type BadgeProps = {
    icon?: React.ReactNode;
    label?: string;
    variant?: 'filled' | 'outline';
    color?: 'yellow' | 'green' | 'blue' | 'gray' | 'purple' | 'red';
    className?: string
}

const variants = cv({
    base: [
        'w-fit shrink-0 flex justify-center items-center py-0.5 px-1 pr-2 rounded',
    ],
    variants: {
        variant: {
            filled: ['border !border-transparent'],
            outline: ['!bg-primary border !border-secondary'],
        },
        color: {
            yellow: ['bg-utility-yellow-50 text-utility-yellow-700'],
            green: ['bg-utility-green-50 text-utility-green-700'],
            red: ['bg-utility-red-50 text-utility-red-700'],
            blue: ['bg-utility-blue-50 text-utility-blue-700'],
            gray: ['bg-utility-gray-50 text-utility-gray-700'],
            purple: ['bg-utility-purple-50 text-utility-purple-700'],
        },
    },
    defaultVariants: {
        variant: 'filled',
        color: 'gray',
    },
})

export function Badge({ icon, variant, color, label, className }: BadgeProps) {

    return (
        <div data-status="Pending" data-style="Badge" className={cn( variants({ variant, color }),className)}>
            {icon && <div className="*:size-4 text-inherit">{icon}</div>}
            <Label.xs className={cn("text-inherit ml-1", variant === 'outline' && "!text-tertiary")}>{label}</Label.xs>
        </div>
    )
}