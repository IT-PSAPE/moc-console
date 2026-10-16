import { useMemo, useState } from 'react'
import type { Checklist } from '@moc/types/checklists'
import { getChecklistCounts } from './checklist-content'
import { useQueryText } from '@/hooks/use-query-text'

export type ChecklistRunCompletionFilter = 'all' | 'open' | 'complete'
export type ChecklistRunSortField = 'name' | 'items' | 'completed'
export type ChecklistRunSortDirection = 'asc' | 'desc'

export type ChecklistRunFilters = {
    search: string
    itemCount: { min: string; max: string }
    completion: ChecklistRunCompletionFilter
    sortField: ChecklistRunSortField
    sortDirection: ChecklistRunSortDirection
}

const defaultFilters: ChecklistRunFilters = {
    search: '',
    itemCount: { min: '', max: '' },
    completion: 'open',
    sortField: 'name',
    sortDirection: 'asc',
}

function toNumber(value: string) {
    if (value.trim() === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

export function useChecklistRunFilters(checklists: Checklist[]) {
    const [filterState, setFilters] = useState<ChecklistRunFilters>(defaultFilters)
    const [search, setSearchQuery] = useQueryText()
    const filters = useMemo(() => ({ ...filterState, search }), [filterState, search])

    const filtered = useMemo(() => {
        const query = filters.search.trim().toLowerCase()
        const minItems = toNumber(filters.itemCount.min)
        const maxItems = toNumber(filters.itemCount.max)

        return checklists.filter((checklist) => {
            const { total, checked } = getChecklistCounts(checklist)
            const isComplete = total > 0 && total === checked
            if (query && !checklist.name.toLowerCase().includes(query) && !checklist.description.toLowerCase().includes(query)) return false
            if (minItems !== null && total < minItems) return false
            if (maxItems !== null && total > maxItems) return false
            if (filters.completion === 'complete' && !isComplete) return false
            if (filters.completion === 'open' && isComplete) return false
            return true
        }).sort((left, right) => {
            const direction = filters.sortDirection === 'asc' ? 1 : -1
            if (filters.sortField === 'name') return direction * left.name.localeCompare(right.name)
            const leftCounts = getChecklistCounts(left)
            const rightCounts = getChecklistCounts(right)
            const leftValue = filters.sortField === 'items' ? leftCounts.total : leftCounts.checked
            const rightValue = filters.sortField === 'items' ? rightCounts.total : rightCounts.checked
            return direction * (leftValue - rightValue)
        })
    }, [checklists, filters])

    function setSearch(value: string) { setSearchQuery(value) }
    function setItemCount(min: string, max: string) { setFilters((current) => ({ ...current, itemCount: { min, max } })) }
    function setCompletion(completion: ChecklistRunCompletionFilter) { setFilters((current) => ({ ...current, completion })) }
    function setSort(sortField: ChecklistRunSortField, sortDirection: ChecklistRunSortDirection) { setFilters((current) => ({ ...current, sortField, sortDirection })) }
    function reset() { setFilters(defaultFilters); setSearchQuery('') }

    const hasActiveFilters = filters.itemCount.min !== '' || filters.itemCount.max !== '' || filters.completion !== defaultFilters.completion

    return { filters, filtered, hasActiveFilters, setSearch, setItemCount, setCompletion, setSort, reset }
}
