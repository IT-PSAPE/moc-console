import { Button as BaseButton } from "@base-ui/react/button";
import type { ButtonHTMLAttributes, ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { Label } from "../display/text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-secondary";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: ReactNode
    iconPosition?: "leading" | "trailing"
    variant?: ButtonVariant
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    "aria-label": string
    icon: ReactNode
    variant?: ButtonVariant
}

const buttonVariants = cv({
    base: [
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border text-nowrap md:min-h-0 flex-none",
        "touch-manipulation transition-colors motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-1",
        "disabled:cursor-not-allowed",
    ],
    variants: {
        variant: {
            primary: [
                "border-transparent bg-brand_solid text-primary_on-brand",
                "hover:bg-brand_solid-hover active:bg-brand_solid-hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
            secondary: [
                "border-secondary bg-primary text-secondary",
                "hover:bg-primary_hover active:bg-primary_hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
            ghost: [
                "border-transparent bg-transparent text-secondary",
                "hover:bg-primary_hover active:bg-primary_hover",
                "disabled:text-disable",
            ],
            danger: [
                "border-error bg-error_solid text-white",
                "hover:border-error hover:bg-error_solid-hover active:bg-error_solid-hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
            "danger-secondary": [
                "border-secondary bg-primary text-secondary hover:text-white",
                "hover:border-error hover:bg-error_solid-hover active:bg-error_solid-hover",
                "disabled:border-disabled disabled:bg-disabled disabled:text-disable",
            ],
        },
        size: {
            default: ["px-3 py-2"],
            icon: ["min-w-11 px-2 py-2 md:min-w-0"],
        },
    },
    defaultVariants: {
        variant: "primary",
        size: "default",
    },
});

function IconSpan({ icon }: { icon: ReactNode }) {
    return (
        <span className="flex shrink-0 items-center justify-center *:size-4">
            {icon}
        </span>
    );
}

function ButtonRoot({ children, className, disabled, icon, iconPosition = "leading", type = "button", variant = "primary", ...props }: ButtonProps) {
    const showLabel = children !== null && children !== undefined && children !== false;
    const showIcon = icon !== null && icon !== undefined;
    const trailing = iconPosition === "trailing";

    return (
        <BaseButton
            type={type}
            disabled={disabled}
            className={cn(buttonVariants({ variant, size: "default" }), className)}
            {...props}
        >
            {showIcon && !trailing ? <IconSpan icon={icon} /> : null}
            {showLabel ? <Label.sm className="inline-flex items-center justify-center gap-2 text-[inherit]">{children}</Label.sm> : null}
            {showIcon && trailing ? <IconSpan icon={icon} /> : null}
        </BaseButton>
    );
}

function IconButton({ icon, className, disabled, type = "button", variant = "primary", ...props }: IconButtonProps) {
    return (
        <BaseButton
            type={type}
            disabled={disabled}
            className={cn(buttonVariants({ variant, size: "icon" }), className)}
            {...props}
        >
            <IconSpan icon={icon} />
        </BaseButton>
    );
}

type LinkButtonProps = Omit<ButtonProps, 'type'> & {
    render: ReactElement
}

type IconLinkButtonProps = Omit<IconButtonProps, 'type'> & {
    render: ReactElement
}

function LinkButton({ children, className, disabled, icon, iconPosition = 'leading', render, variant = 'primary', ...props }: LinkButtonProps) {
    const showIcon = icon !== null && icon !== undefined
    const trailing = iconPosition === 'trailing'

    return (
        <BaseButton nativeButton={false} render={render} disabled={disabled} className={cn(buttonVariants({ variant, size: 'default' }), className)} {...props}>
            {showIcon && !trailing ? <IconSpan icon={icon} /> : null}
            <Label.sm className="inline-flex items-center justify-center gap-2 text-[inherit]">{children}</Label.sm>
            {showIcon && trailing ? <IconSpan icon={icon} /> : null}
        </BaseButton>
    )
}

function IconLinkButton({ icon, className, disabled, render, variant = 'primary', ...props }: IconLinkButtonProps) {
    return (
        <BaseButton nativeButton={false} render={render} disabled={disabled} className={cn(buttonVariants({ variant, size: 'icon' }), className)} {...props}>
            <IconSpan icon={icon} />
        </BaseButton>
    )
}

function UnstyledButton({ children, className, disabled, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <BaseButton type={type} disabled={disabled} className={className} {...props}>
            {children}
        </BaseButton>
    );
}

type SurfaceButtonProps = Omit<ComponentProps<typeof BaseButton>, "className" | "nativeButton" | "render"> & {
    className?: string
};

function SurfaceButton({ children, className, ...props }: SurfaceButtonProps) {
    return (
        <BaseButton nativeButton={false} render={<div />} className={className} {...props}>
            {children}
        </BaseButton>
    );
}

export const Button = Object.assign(ButtonRoot, {
    Icon: IconButton,
    IconLink: IconLinkButton,
    Link: LinkButton,
    Surface: SurfaceButton,
    Unstyled: UnstyledButton,
});
