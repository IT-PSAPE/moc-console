import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@moc/utils/cn";
import type { ReactNode } from "react";
import { Label } from "../display/text";

// ─── Group ───────────────────────────────────────────────
//
// Base UI's Radio must live inside a RadioGroup, so selection state moves from
// the individual <Radio> (the old native `checked`/`onChange`/`name` props) up
// to <RadioGroup value onValueChange>. The group renders a `role="radiogroup"`
// div and is otherwise layout-transparent — wrap any existing markup in it.

type RadioGroupProps = {
    children: ReactNode
    className?: string
    defaultValue?: string
    disabled?: boolean
    name?: string
    onValueChange?: (value: string) => void
    value?: string
}

export function RadioGroup({ children, className, defaultValue, disabled, name, onValueChange, value }: RadioGroupProps) {
    return (
        <BaseRadioGroup
            className={className}
            defaultValue={defaultValue}
            disabled={disabled}
            name={name}
            onValueChange={(next) => onValueChange?.(String(next))}
            value={value}
        >
            {children}
        </BaseRadioGroup>
    );
}

// ─── Radio ───────────────────────────────────────────────

type RadioProps = {
    value: string
    children?: ReactNode
    className?: string
    disabled?: boolean
    "aria-label"?: string
}

export function Radio({ value, children, className, disabled, ...rest }: RadioProps) {
    const showLabel = children !== null && children !== undefined && children !== false

    return (
        <label className="group flex min-h-control-sm landscape:min-h-control-lg w-fit items-center gap-2 has-[:disabled]:cursor-not-allowed">
            <BaseRadio.Root
                value={value}
                disabled={disabled}
                aria-label={rest["aria-label"]}
                className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-full border shadow-xs",
                    "border-primary bg-primary transition-colors",
                    "group-hover:border-brand",
                    // Focus moves to Base UI's Radio.Root (no sibling `peer` input).
                    "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-border-brand/20 focus-visible:outline-none",
                    "data-[checked]:border-brand data-[checked]:bg-brand_solid",
                    "data-[disabled]:bg-tertiary data-[disabled]:group-hover:border-primary",
                    className,
                )}
            >
                <BaseRadio.Indicator
                    keepMounted
                    className="size-1.5 rounded-full bg-white opacity-0 transition-opacity data-[checked]:opacity-100"
                />
            </BaseRadio.Root>
            {showLabel ? <Label.sm className="font-medium text-secondary">{children}</Label.sm> : null}
        </label>
    );
}
