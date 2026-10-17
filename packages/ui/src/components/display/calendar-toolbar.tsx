import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCalendarToolbarLabels } from '@moc/utils/calendar-presentation'
import { Button } from '../controls/button'
import { ButtonGroup } from '../controls/button-group'
import { Select } from '../form/select'
import { cn } from '@moc/utils/cn'

type CalendarToolbarProps = {
    className?: string
    date: Date
    view: string
    views?: { value: string; label: string }[]
    onViewChange?: (value: string) => void
    onPrevious: () => void
    onNext: () => void
    onToday: () => void
    children?: ReactNode
}

export function CalendarToolbar({ date, view, views, onViewChange, onPrevious, onNext, onToday, children, className }: CalendarToolbarProps) {
    const labels = getCalendarToolbarLabels(date, view)
    function renderView(option: NonNullable<CalendarToolbarProps['views']>[number]) {
        return <Select.Item key={option.value} value={option.value}>{option.label}</Select.Item>
    }
    function changeView(value: string | null) {
        if (value !== null) onViewChange?.(value)
    }
    return <header className={cn('flex flex-wrap items-center justify-between gap-2 border-b border-secondary p-2', className)}>
        <div className="flex min-w-0 items-center gap-2">
            <div aria-hidden="true" className="flex w-10 shrink-0 flex-col overflow-hidden rounded-lg border border-secondary text-center shadow-xs">
                <span className="border-b border-secondary bg-secondary py-0.5 label-xs uppercase text-secondary">{labels.stamp}</span>
                <span className="py-1 label-md text-brand">{labels.day}</span>
            </div>
            <div className="min-w-0" aria-live="polite" aria-atomic="true">
                <h2 className="label-md text-primary">{labels.title}</h2>
                {labels.range && <p className="mt-0.5 paragraph-sm text-tertiary">{labels.range}</p>}
            </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 landscape:w-full landscape:justify-start">
            {view !== 'agenda' && <ButtonGroup aria-label="Calendar navigation">
                <Button.Icon variant="secondary" aria-label={`Previous ${view}`} icon={<ChevronLeft />} onClick={onPrevious} />
                <Button variant="secondary" onClick={onToday}>Today</Button>
                <Button.Icon variant="secondary" aria-label={`Next ${view}`} icon={<ChevronRight />} onClick={onNext} />
            </ButtonGroup>}
            {views && onViewChange && <Select.Root value={view} onValueChange={changeView} items={views}><Select.Trigger className="!w-auto !bg-primary" aria-label="Calendar view" /><Select.Content>{views.map(renderView)}</Select.Content></Select.Root>}
            {children}
        </div>
    </header>
}
