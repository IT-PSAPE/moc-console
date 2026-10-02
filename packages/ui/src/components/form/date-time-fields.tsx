import { useId } from "react";
import { cn } from "@moc/utils/cn";
import { Paragraph } from "@moc/ui/components/display/text";
import { FormLabel } from "./form-label";
import { Input } from "./input";
import { useDateTimeFields } from "./use-date-time-fields";

type DateTimeFieldsProps = {
    value: string
    onChange: (value: string) => void
    label?: string
    ariaLabel?: string
    name?: string
    dateLabel?: string
    timeLabel?: string
    required?: boolean
    optional?: boolean
    disabled?: boolean
    helperText?: string
    errorText?: string
    incompleteText?: string
    style?: "outline" | "ghost"
    fieldLabels?: "visible" | "hidden"
    className?: string
    fieldsClassName?: string
}

export function DateTimeFields({ value, onChange, label, ariaLabel, name, dateLabel = "Date", timeLabel = "Time", required, optional, disabled, helperText, errorText, incompleteText, style = "outline", fieldLabels = "visible", className, fieldsClassName }: DateTimeFieldsProps) {
    const { state: { date, time, isIncomplete }, actions: { handleDateChange, handleTimeChange } } = useDateTimeFields(value, onChange);
    const resolvedIncompleteText = incompleteText ?? (required ? "Date and time are both required." : "Choose both date and time, or clear both.");
    const accessibleLabel = ariaLabel ?? label;
    const fieldLabelClassName = fieldLabels === "hidden" ? "sr-only" : undefined;
    const generatedId = useId();
    const fieldIdBase = name ?? generatedId;
    const dateId = `${fieldIdBase}-date`;
    const timeId = `${fieldIdBase}-time`;
    const feedbackId = `${fieldIdBase}-feedback`;
    const feedbackText = errorText ?? (isIncomplete ? resolvedIncompleteText : helperText);
    const hasError = Boolean(errorText || isIncomplete);

    return (
        <div className={cn("flex w-full min-w-0 flex-col gap-1.5", className)}>
            {label && <FormLabel label={label} required={required} optional={optional} />}
            <div className={cn("grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2", fieldsClassName)}>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <FormLabel label={dateLabel} htmlFor={dateId} className={fieldLabelClassName} />
                    <Input id={dateId} aria-label={accessibleLabel ? `${accessibleLabel} date` : dateLabel} aria-describedby={feedbackText ? feedbackId : undefined} aria-invalid={hasError || undefined} name={name ? `${name}-date` : undefined} type="date" value={date} onChange={handleDateChange} required={required} disabled={disabled} style={style} />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                    <FormLabel label={timeLabel} htmlFor={timeId} className={fieldLabelClassName} />
                    <Input id={timeId} aria-label={accessibleLabel ? `${accessibleLabel} time` : timeLabel} aria-describedby={feedbackText ? feedbackId : undefined} aria-invalid={hasError || undefined} name={name ? `${name}-time` : undefined} type="time" value={time} onChange={handleTimeChange} required={required} disabled={disabled} style={style} />
                </div>
            </div>
            {feedbackText && <Paragraph.xs id={feedbackId} role={hasError ? "alert" : undefined} aria-live="polite" className={hasError ? "text-error" : "text-quaternary"}>{feedbackText}</Paragraph.xs>}
        </div>
    );
}
