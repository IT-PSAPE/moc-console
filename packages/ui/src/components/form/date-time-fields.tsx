import { useEffect, useState, type ChangeEvent } from "react";
import { cn } from "@moc/utils/cn";
import { Paragraph } from "@moc/ui/components/display/text";
import { FormLabel } from "./form-label";
import { Input } from "./input";

type DateTimeFieldsProps = {
    value: string
    onChange: (value: string) => void
    label?: string
    dateLabel?: string
    timeLabel?: string
    required?: boolean
    optional?: boolean
    disabled?: boolean
    helperText?: string
    errorText?: string
    incompleteText?: string
    style?: "outline" | "ghost"
    className?: string
    fieldsClassName?: string
}

function splitDateTime(value: string): { date: string; time: string } {
    const [date = "", time = ""] = value.split("T");
    return { date, time: time.slice(0, 5) };
}

function combineDateTime(date: string, time: string): string {
    return date && time ? `${date}T${time}` : "";
}

export function DateTimeFields({ value, onChange, label, dateLabel = "Date", timeLabel = "Time", required, optional, disabled, helperText, errorText, incompleteText, style = "outline", className, fieldsClassName }: DateTimeFieldsProps) {
    const [date, setDate] = useState(splitDateTime(value).date);
    const [time, setTime] = useState(splitDateTime(value).time);
    const isIncomplete = Boolean(date || time) && !(date && time);
    const resolvedIncompleteText = incompleteText ?? (required ? "Date and time are both required." : "Choose both date and time, or clear both.");

    useEffect(() => {
        const next = splitDateTime(value);
        setDate(next.date);
        setTime(next.time);
    }, [value]);

    function handleDateChange(event: ChangeEvent<HTMLInputElement>) {
        const nextDate = event.target.value;
        setDate(nextDate);
        onChange(combineDateTime(nextDate, time));
    }

    function handleTimeChange(event: ChangeEvent<HTMLInputElement>) {
        const nextTime = event.target.value;
        setTime(nextTime);
        onChange(combineDateTime(date, nextTime));
    }

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && <FormLabel label={label} required={required} optional={optional} />}
            <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", fieldsClassName)}>
                <div className="flex flex-col gap-1.5">
                    <FormLabel label={dateLabel} />
                    <Input type="date" value={date} onChange={handleDateChange} required={required} disabled={disabled} style={style} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <FormLabel label={timeLabel} />
                    <Input type="time" value={time} onChange={handleTimeChange} required={required} disabled={disabled} style={style} />
                </div>
            </div>
            {errorText && <Paragraph.xs className="text-error">{errorText}</Paragraph.xs>}
            {!errorText && isIncomplete && <Paragraph.xs className="text-error">{resolvedIncompleteText}</Paragraph.xs>}
            {!errorText && !isIncomplete && helperText && <Paragraph.xs className="text-quaternary">{helperText}</Paragraph.xs>}
        </div>
    );
}
