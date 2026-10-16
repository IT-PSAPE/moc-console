import type { ReactNode } from 'react'

export type CalendarEvent<T = unknown> = {
    id?: string
    date: Date
    endDate?: Date
    allDay?: boolean
    label: string
    color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'
    data?: T
}
export type CalendarRenderEvent<T = unknown> = (event: CalendarEvent<T>, index: number) => ReactNode
export type CalendarRenderDayProps<T = unknown> = {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    events: CalendarEvent<T>[]
}
