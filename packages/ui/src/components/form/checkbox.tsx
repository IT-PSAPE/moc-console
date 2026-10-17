import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { Check, Minus } from "lucide-react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";
import { Label } from "../display/text";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
    children?: ReactNode
    indeterminate?: boolean
}

const checkboxControlVariants = cv({
    base: [
        "relative inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded border shadow-xs",
        "bg-primary text-on-brand transition-colors",
        "border-primary group-hover:border-brand",
        // Base UI puts focus on Checkbox.Root itself (no sibling `peer` input to
        // target), so focus styles are applied directly rather than via `peer-*`.
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-border-brand/20 focus-visible:outline-none",
        // Checked / indeterminate / disabled are surfaced as data-attributes on
        // Base UI's Checkbox.Root rather than the native `:checked`/`:disabled`
        // pseudo-classes the old `peer-*` selectors relied on.
        "data-[checked]:border-brand data-[checked]:bg-brand_solid",
        "data-[indeterminate]:border-brand data-[indeterminate]:bg-brand_solid",
        "data-[disabled]:bg-tertiary data-[disabled]:text-quaternary data-[disabled]:group-hover:border-primary",
    ],
});

export function Checkbox({
    children,
    className,
    indeterminate = false,
    checked,
    defaultChecked,
    onChange,
    disabled,
    name,
    value,
    required,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledby,
    "aria-describedby": ariaDescribedby,
}: CheckboxProps) {
    function handleCheckedChange(next: boolean) {
        if (!onChange) return
        const target = { checked: next, name: name ?? "", value: value ?? "", type: "checkbox" }
        onChange({ target, currentTarget: target } as unknown as ChangeEvent<HTMLInputElement>)
    }

    return (
        <label className={cn("group flex min-h-control-sm landscape:min-h-control-lg w-fit items-start landscape:items-center gap-2 has-[:disabled]:cursor-not-allowed *:even:mt-0.75 landscape:*:even:mt-0", className)}>
            <BaseCheckbox.Root
                checked={checked as boolean | undefined}
                defaultChecked={defaultChecked as boolean | undefined}
                indeterminate={indeterminate}
                disabled={disabled}
                name={name}
                value={value as string | undefined}
                required={required}
                id={id}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
                aria-describedby={ariaDescribedby}
                onCheckedChange={handleCheckedChange}
                className={checkboxControlVariants()}
            >
                <BaseCheckbox.Indicator
                    keepMounted
                    className="inline-flex opacity-0 data-[checked]:opacity-100 data-[indeterminate]:opacity-100"
                >
                    {indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
                </BaseCheckbox.Indicator>
            </BaseCheckbox.Root>
            {children !== null && children !== undefined && children !== false
                ? <Label.sm className="font-medium text-secondary">{children}</Label.sm>
                : null}
        </label>
    );
}
