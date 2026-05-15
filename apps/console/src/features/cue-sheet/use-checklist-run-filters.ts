import { useMemo, useState } from 'react'
import type { Checklist } from '@moc/types/cue-sheet'
import { getChecklistCounts } from './checklist-content'

export type ChecklistRunCompletionFilter = 'all' | 'open' | 'complete'
export type ChecklistRunSortField = 'scheduledAt' | 'name' | 'items' | 'completed'
export type ChecklistRunSortDirection = 'asc' | 'desc'

export type ChecklistRunFilters = {
    search: string
    includePast: boolean
    dateRange: { start: string; end: string }
    itemCount: { min: string; max: string }
    completion: ChecklistRunCompletionFilter
    sortField: ChecklistRunSortField
    sortDirection: ChecklistRunSortDirection
}

const defaultFilters: ChecklistRunFilters = {
    search: '',
    includePast: true,
    dateRange: { start: '', end: '' },
    itemCount: { min: '', max: '' },
    completion: 'all',
    sortField: 'scheduledAt',
    sortDirection: 'asc',
}

function toNumber(value: string) {
    if (value.trim() === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function getScheduledTime(checklist: Checklist) {
    return checklist.scheduledAt ? new Date(checklist.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
}

export function useChecklistRunFilters(checklists: Checklist[]) {
    const [filters, setFilters] = useState<ChecklistRunFilters>(defaultFilters)
    const [currentTime] = useState(() => Date.now())

    const filtered = useMemo(() => {
        const search = filters.search.trim().toLowerCase()
        const start = filters.dateRange.start ? new Date(filters.dateRange.start).getTime() : null
        const end = filters.dateRange.end ? new Date(filters.dateRange.end).getTime() : null
        const minItems = toNumber(filters.itemCount.min)
        const maxItems = toNumber(filters.itemCount.max)

        const result = checklists.filter((checklist) => {
            const scheduledTime = getScheduledTime(checklist)
            const { total, checked } = getChecklistCounts(checklist)
            const isComplete = total > 0 && total === checked

            if (!filters.includePast && scheduledTime < currentTime) return false
            if (search && !checklist.name.toLowerCase().includes(search) && !checklist.description.toLowerCase().includes(search)) return false
            if (start !== null && scheduledTime < start) return false
            if (end !== null && scheduledTime > end) return false
            if (minItems !== null && total < minItems) return false
            if (maxItems !== null && total > maxItems) return false
            if (filters.completion === 'complete' && !isComplete) return false
            if (filters.completion === 'open' && isComplete) return false
            return true
        })

        const direction = filters.sortDirection === 'asc' ? 1 : -1
        return result.sort((a, b) => {
            if (filters.sortField === 'name') return direction * a.name.localeCompare(b.name)
            if (filters.sortField === 'items') return direction * (getChecklistCounts(a).total - getChecklistCounts(b).total)
            if (filters.sortField === 'completed') return direction * (getChecklistCounts(a).checked - getChecklistCounts(b).checked)
            return direction * (getScheduledTime(a) - getScheduledTime(b))
        })
    }, [checklists, currentTime, filters])

    function setSearch(search: string) {
        setFilters((current) => ({ ...current, search }))
    }

    function setIncludePast(includePast: boolean) {
        setFilters((current) => ({ ...current, includePast }))
    }

    function setDateRange(start: string, end: string) {
        setFilters((current) => ({ ...current, dateRange: { start, end } }))
    }

    function setItemCount(min: string, max: string) {
        setFilters((current) => ({ ...current, itemCount: { min, max } }))
    }

    function setCompletion(completion: ChecklistRunCompletionFilter) {
        setFilters((current) => ({ ...current, completion }))
    }

    function setSort(sortField: ChecklistRunSortField, sortDirection: ChecklistRunSortDirection) {
        setFilters((current) => ({ ...current, sortField, sortDirection }))
    }

    function reset() {
        setFilters(defaultFilters)
    }

    const hasActiveFilters = filters.includePast ||
        filters.dateRange.start !== '' ||
        filters.dateRange.end !== '' ||
        filters.itemCount.min !== '' ||
        filters.itemCount.max !== '' ||
        filters.completion !== 'all'

    return {
        filters,
        filtered,
        hasActiveFilters,
        setSearch,
        setIncludePast,
        setDateRange,
        setItemCount,
        setCompletion,
        setSort,
        reset,
    }
}
