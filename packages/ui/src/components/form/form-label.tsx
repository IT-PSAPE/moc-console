import type { ReactNode } from "react";
import { cn } from "@moc/utils/cn";
import { Label as TextLabel } from "@moc/ui/components/display/text";

type LabelProps = {
    label: string
    htmlFor?: string
    required?: boolean
    optional?: boolean
    disabled?: boolean
    className?: string
}

type FormFieldProps = LabelProps & {
    children: ReactNode
    fieldClassName?: string
}

export function FormField({ label, htmlFor, required, optional, disabled, className, fieldClassName, children }: FormFieldProps) {
    return (
        <div className={cn("flex flex-col gap-1.5", fieldClassName)}>
            <FormLabel label={label} htmlFor={htmlFor} required={required} optional={optional} disabled={disabled} className={className} />
            {children}
        </div>
    )
}

export function FormLabel({ label, htmlFor, required, optional, className }: LabelProps) {
    return (
        <label htmlFor={htmlFor} className={cn("flex justify-start items-center gap-0.5", className)}>
            <TextLabel.xs className="text-primary">{label}</TextLabel.xs>
            {required && <TextLabel.xs  className="text-brand_secondary">*</TextLabel.xs>}
            {optional && <TextLabel.xs className="text-quaternary">(Optional)</TextLabel.xs>}
        </label>
    )
}
