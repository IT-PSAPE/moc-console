import { Label } from "@/components/text";
import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";
import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";

type CheckboxSize = "sm" | "md" | "lg";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
    children?: ReactNode
    indeterminate?: boolean
    size?: CheckboxSize
}

const checkboxRootVariants = cv({
    base: [
        "group inline-flex w-fit items-center gap-2 align-top",
        "has-[:disabled]:cursor-not-allowed",
    ],
    variants: {
        size: {
            sm: ["gap-1.5"],
            md: ["gap-2"],
            lg: ["gap-3"],
        },
    },
    defaultVariants: {
        size: "md",
    },
});

const checkboxControlVariants = cv({
    base: [
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border",
        "bg-primary text-primary_on-brand transition-colors",
        "border-secondary group-hover:border-brand",
        "peer-focus-visible:border-brand peer-focus-visible:ring-3 peer-focus-visible:ring-border-brand/10",
        "peer-checked:border-brand peer-checked:bg-brand_solid",
        "peer-indeterminate:border-brand peer-indeterminate:bg-brand_solid",
        "peer-disabled:border-disabled peer-disabled:bg-disabled",
        "peer-disabled:group-hover:border-disabled peer-disabled:group-hover:bg-disabled",
        "peer-disabled:text-foreground-disabled",
        "peer-checked:[&_[data-checkbox-icon=check]]:opacity-100",
        "peer-indeterminate:[&_[data-checkbox-icon=check]]:opacity-0",
        "peer-indeterminate:[&_[data-checkbox-icon=minus]]:opacity-100",
    ],
    variants: {
        size: {
            sm: ["size-4"],
            md: ["size-5"],
            lg: ["size-6"],
        },
    },
    defaultVariants: {
        size: "md",
    },
});

const checkboxLabelVariants = cv({
    base: [
        "text-secondary transition-colors",
        "group-has-[:disabled]:text-disable",
    ],
});

export function Checkbox({ children, className, indeterminate = false, size = "md", ...props }: CheckboxProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const LabelComponent = size === "sm" ? Label.xs : size === "lg" ? Label.bg : Label.sm;

    useEffect(() => {
        if (!inputRef.current) {
            return;
        }

        inputRef.current.indeterminate = indeterminate && !inputRef.current.checked;
    }, [indeterminate, props.checked]);

    return (
        <label className={cn(checkboxRootVariants({ size }), className)}>
            <span className="relative inline-flex shrink-0">
                <input
                    {...props}
                    ref={inputRef}
                    type="checkbox"
                    aria-checked={indeterminate ? "mixed" : undefined}
                    className="peer sr-only"
                />
                <span className={checkboxControlVariants({ size })} aria-hidden="true">
                    <svg
                        viewBox="0 0 12 10"
                        fill="none"
                        data-checkbox-icon="check"
                        className="pointer-events-none size-3 opacity-0 transition-opacity"
                    >
                        <path
                            d="M1.5 5L4.5 8L10.5 2"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <svg
                        viewBox="0 0 10 2"
                        fill="none"
                        data-checkbox-icon="minus"
                        className="pointer-events-none absolute size-2.5 opacity-0 transition-opacity"
                    >
                        <path
                            d="M1 1H9"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        />
                    </svg>
                </span>
            </span>
            {children ? <LabelComponent className={checkboxLabelVariants()}>{children}</LabelComponent> : null}
        </label>
    );
}
