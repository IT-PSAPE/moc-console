import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";
import { Label } from "../display/text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: ReactNode
    iconOnly?: boolean
    variant?: ButtonVariant
}

const buttonVariants = cv({
    base: [
        "inline-flex items-center justify-center gap-2 rounded-md border",
        "transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1",
        "disabled:cursor-not-allowed",
    ],
    variants: {
        variant: {
            primary: [
                "border-transparent bg-brand_solid text-primary_on-brand",
                "hover:bg-brand_solid-hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
            secondary: [
                "border-secondary bg-primary text-secondary",
                "hover:bg-primary_hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
            ghost: [
                "border-transparent bg-transparent text-secondary",
                "hover:bg-primary_hover",
                "disabled:text-disable",
            ],
            danger: [
                "border-error bg-error_solid text-white",
                "hover:border-error hover:bg-error_solid-hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
        },
        iconOnly: {
            false: ["px-3 py-2"],
            true: ["w-8 px-2 py-2"],
        },
    },
    defaultVariants: {
        variant: "primary",
        iconOnly: "false",
    },
});

function ButtonIcon({ icon }: { icon: ReactNode }) {
    return (
        <span className="flex shrink-0 items-center justify-center *:size-4">
            {icon}
        </span>
    );
}

export function Button({ children, className, disabled, icon, iconOnly = false, type = "button", variant = "primary", ...props }: ButtonProps) {
    const showLabel = !iconOnly && children !== null && children !== undefined && children !== false;
    const showIcon = icon !== null && icon !== undefined;
    const isIconOnly = iconOnly || (!showLabel && showIcon);

    return (
        <button
            type={type}
            disabled={disabled}
            className={cn(buttonVariants({ variant, iconOnly: isIconOnly ? "true" : "false" }), className)}
            {...props}
        >
            {showIcon ? <ButtonIcon icon={icon} /> : null}
            {showLabel ? <Label.sm className="text-[inherit]">{children}</Label.sm> : null}
        </button>
    );
}
