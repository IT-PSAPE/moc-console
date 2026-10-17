import { Button as BaseButton } from "@base-ui/react/button";
import type { ButtonHTMLAttributes, ComponentProps, ReactElement, ReactNode, Ref } from "react";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { Label } from "../display/text";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success" | "danger" | "danger-secondary" | "link";
type ButtonSize = "md" | "sm";

// React 19 passes `ref` as an ordinary prop, so it rides along in `...props`
// onto the underlying element — it only has to be declared to be typed.
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon?: ReactNode
    iconPosition?: "leading" | "trailing"
    variant?: ButtonVariant
    size?: ButtonSize
    ref?: Ref<HTMLButtonElement>
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    "aria-label": string
    icon: ReactNode
    variant?: ButtonVariant
    size?: ButtonSize
    ref?: Ref<HTMLButtonElement>
}

// The `size` bucket owns the control's height/padding outright (never left to
// the shared base) so a chosen bucket never has to out-fight another bucket's
// classes for the same `h-*`/`size-*` utility: tailwind-merge only recognizes
// conflicts between classes it can classify into the same group, and the
// custom `h-control`/`size-control` tokens aren't in its built-in height/size
// vocabulary, so two such classes landing in the same string would both
// survive and the winner would depend on Tailwind's generated stylesheet
// order rather than anything declared here.
const buttonVariants = cv({
    base: [
        "inline-flex items-center justify-center gap-1.5 rounded-lg whitespace-nowrap flex-none",
        "touch-manipulation transition-colors motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand",
        "disabled:opacity-50 disabled:cursor-not-allowed",
    ],
    variants: {
        size: {
            md: ["h-control px-3 landscape:h-control-lg"],
            sm: ["h-control-sm px-2.5 landscape:h-control-lg"],
            icon: ["size-control px-0 landscape:size-control-lg"],
            "icon-sm": ["size-control-sm px-0 landscape:size-control-lg"],
        },
        variant: {
            primary: ["bg-brand_solid text-on-brand hover:bg-brand_solid/90"],
            secondary: ["bg-primary text-secondary border border-primary shadow-xs hover:bg-secondary"],
            ghost: ["text-tertiary hover:bg-secondary hover:text-secondary"],
            danger: ["bg-error_solid text-on-brand hover:bg-error_solid/90"],
            "danger-secondary": ["bg-primary text-error border border-primary shadow-xs hover:bg-error hover:border-error"],
            success: ["bg-success text-success hover:bg-success/80"],
            link: ["h-auto px-0 gap-1 text-brand hover:underline"],
        },
    },
    defaultVariants: {
        variant: "primary",
        size: "md",
    },
});

// `link` supplies its own `h-auto px-0` and must win outright over whatever
// the `size` bucket would add — rather than leaning on tailwind-merge to
// referee two custom height tokens (see note above), the size bucket is
// simply never requested for it.
function textSizeKey(variant: ButtonVariant, size: ButtonSize): ButtonSize | undefined {
    return variant === "link" ? undefined : size;
}

function iconSizeKey(variant: ButtonVariant, size: ButtonSize): "icon" | "icon-sm" | undefined {
    if (variant === "link") return undefined;
    return size === "sm" ? "icon-sm" : "icon";
}

function IconSpan({ icon }: { icon: ReactNode }) {
    return (
        <span className="flex shrink-0 items-center justify-center *:size-4">
            {icon}
        </span>
    );
}

function ButtonRoot({ children, className, disabled, icon, iconPosition = "leading", size = "md", type = "button", variant = "primary", ...props }: ButtonProps) {
    const showLabel = children !== null && children !== undefined && children !== false;
    const showIcon = icon !== null && icon !== undefined;
    const trailing = iconPosition === "trailing";

    return (
        <BaseButton
            type={type}
            disabled={disabled}
            className={cn(buttonVariants({ variant, size: textSizeKey(variant, size) }), className)}
            {...props}
        >
            {showIcon && !trailing ? <IconSpan icon={icon} /> : null}
            {showLabel ? <Label.sm className="inline-flex items-center justify-center gap-2 text-[inherit]">{children}</Label.sm> : null}
            {showIcon && trailing ? <IconSpan icon={icon} /> : null}
        </BaseButton>
    );
}

function IconButton({ icon, className, disabled, size = "md", type = "button", variant = "primary", ...props }: IconButtonProps) {
    return (
        <BaseButton
            type={type}
            disabled={disabled}
            className={cn(buttonVariants({ variant, size: iconSizeKey(variant, size) }), className)}
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

function LinkButton({ children, className, disabled, icon, iconPosition = 'leading', render, size = 'md', variant = 'primary', ...props }: LinkButtonProps) {
    const showIcon = icon !== null && icon !== undefined
    const trailing = iconPosition === 'trailing'

    return (
        <BaseButton nativeButton={false} role="link" render={render} disabled={disabled} className={cn(buttonVariants({ variant, size: textSizeKey(variant, size) }), className)} {...props}>
            {showIcon && !trailing ? <IconSpan icon={icon} /> : null}
            <Label.sm className="inline-flex items-center justify-center gap-2 text-[inherit]">{children}</Label.sm>
            {showIcon && trailing ? <IconSpan icon={icon} /> : null}
        </BaseButton>
    )
}

function IconLinkButton({ icon, className, disabled, render, size = 'md', variant = 'primary', ...props }: IconLinkButtonProps) {
    return (
        <BaseButton nativeButton={false} role="link" render={render} disabled={disabled} className={cn(buttonVariants({ variant, size: iconSizeKey(variant, size) }), className)} {...props}>
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
