import { useState, type ChangeEvent } from 'react';

type DateTimeParts = { date: string; time: string };
type DateTimeFieldsResult = {
    state: DateTimeParts & { isIncomplete: boolean };
    actions: {
        handleDateChange: (event: ChangeEvent<HTMLInputElement>) => void;
        handleTimeChange: (event: ChangeEvent<HTMLInputElement>) => void;
    };
};

function splitDateTime(value: string): DateTimeParts {
    const [date = '', time = ''] = value.split('T');
    return { date, time: time.slice(0, 5) };
}

function combineDateTime(date: string, time: string): string {
    return date && time ? `${date}T${time}` : '';
}

export function useDateTimeFields(value: string, onChange: (value: string) => void): DateTimeFieldsResult {
    const [fields, setFields] = useState(() => ({ ...splitDateTime(value), value }));

    // An incomplete local edit emits an empty value. Its parent echo must
    // not clear the other field; only an external value replaces the draft.
    if (value !== fields.value) {
        setFields({ ...splitDateTime(value), value });
    }

    function handleDateChange(event: ChangeEvent<HTMLInputElement>): void {
        const date = event.currentTarget.value;
        const nextValue = combineDateTime(date, fields.time);
        setFields({ ...fields, date, value: nextValue });
        onChange(nextValue);
    }

    function handleTimeChange(event: ChangeEvent<HTMLInputElement>): void {
        const time = event.currentTarget.value;
        const nextValue = combineDateTime(fields.date, time);
        setFields({ ...fields, time, value: nextValue });
        onChange(nextValue);
    }

    return {
        state: { date: fields.date, time: fields.time, isIncomplete: Boolean(fields.date || fields.time) && !(fields.date && fields.time) },
        actions: { handleDateChange, handleTimeChange },
    };
}
