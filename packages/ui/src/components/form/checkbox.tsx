import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { cn } from "@moc/utils/cn";
import { cv } from "@moc/utils/cv";
import { Check, Minus } from "lucide-react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode } from "react";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
    children?: ReactNode
    indeterminate?: boolean
}

const checkboxControlVariants = cv({
    base: [
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border",
        "bg-primary text-primary_on-brand transition-colors",
        "border-secondary group-hover:border-brand",
        // Base UI puts focus on Checkbox.Root itself (no sibling `peer` input to
        // target), so focus styles are applied directly rather than via `peer-*`.
        "focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-border-brand/10 focus-visible:outline-none",
        // Checked / indeterminate / disabled are surfaced as data-attributes on
        // Base UI's Checkbox.Root rather than the native `:checked`/`:disabled`
        // pseudo-classes the old `peer-*` selectors relied on.
        "data-[checked]:border-brand data-[checked]:bg-brand_solid",
        "data-[indeterminate]:border-brand data-[indeterminate]:bg-brand_solid",
        "data-[disabled]:border-disabled data-[disabled]:bg-disabled data-[disabled]:text-foreground-disabled",
        "data-[disabled]:group-hover:border-disabled data-[disabled]:group-hover:bg-disabled",
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
    return (
        <label className={cn("group flex w-fit items-start gap-1.5 has-[:disabled]:cursor-not-allowed *:even:mt-0.75", className)}>
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
                onCheckedChange={(next) => {
                    if (!onChange) return
                    // Bridge Base UI's (boolean) callback back to the native
                    // ChangeEvent shape consumers read via `event.target.checked`.
                    const target = { checked: next, name: name ?? "", value: value ?? "", type: "checkbox" }
                    onChange({ target, currentTarget: target } as unknown as ChangeEvent<HTMLInputElement>)
                }}
                className={checkboxControlVariants()}
            >
                <BaseCheckbox.Indicator
                    keepMounted
                    className="inline-flex opacity-0 data-[checked]:opacity-100 data-[indeterminate]:opacity-100"
                >
                    {indeterminate ? <Minus className="size-4" /> : <Check className="size-4" />}
                </BaseCheckbox.Indicator>
            </BaseCheckbox.Root>
            {children}
        </label>
    );
}
