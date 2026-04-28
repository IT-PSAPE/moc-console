import { useMemo, useState } from 'react'
import type { CueSheetEvent, Track } from '@/types/cue-sheet'

export type EventRunSortField = 'scheduledAt' | 'title' | 'duration' | 'tracks' | 'cues'
export type EventRunSortDirection = 'asc' | 'desc'

export type EventRunFilters = {
    search: string
    includePast: boolean
    dateRange: { start: string; end: string }
    trackCount: { min: string; max: string }
    cueCount: { min: string; max: string }
    duration: { min: string; max: string }
    sortField: EventRunSortField
    sortDirection: EventRunSortDirection
}

const defaultFilters: EventRunFilters = {
    search: '',
    includePast: true,
    dateRange: { start: '', end: '' },
    trackCount: { min: '', max: '' },
    cueCount: { min: '', max: '' },
    duration: { min: '', max: '' },
    sortField: 'scheduledAt',
    sortDirection: 'asc',
}

function toNumber(value: string) {
    if (value.trim() === '') return null
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

function getTrackCount(event: CueSheetEvent, tracksByEventId: Record<string, Track[]>) {
    return tracksByEventId[event.id]?.length ?? 0
}

function getCueCount(event: CueSheetEvent, tracksByEventId: Record<string, Track[]>) {
    return tracksByEventId[event.id]?.reduce((total, track) => total + track.cues.length, 0) ?? 0
}

function getScheduledTime(event: CueSheetEvent) {
    return event.scheduledAt ? new Date(event.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER
}

export function useEventRunFilters(events: CueSheetEvent[], tracksByEventId: Record<string, Track[]>) {
    const [filters, setFilters] = useState<EventRunFilters>(defaultFilters)
    const [currentTime] = useState(() => Date.now())

    const filtered = useMemo(() => {
        const search = filters.search.trim().toLowerCase()
        const start = filters.dateRange.start ? new Date(filters.dateRange.start).getTime() : null
        const end = filters.dateRange.end ? new Date(filters.dateRange.end).getTime() : null
        const minTracks = toNumber(filters.trackCount.min)
        const maxTracks = toNumber(filters.trackCount.max)
        const minCues = toNumber(filters.cueCount.min)
        const maxCues = toNumber(filters.cueCount.max)
        const minDuration = toNumber(filters.duration.min)
        const maxDuration = toNumber(filters.duration.max)

        const result = events.filter((event) => {
            const scheduledTime = getScheduledTime(event)
            const trackCount = getTrackCount(event, tracksByEventId)
            const cueCount = getCueCount(event, tracksByEventId)

            if (!filters.includePast && scheduledTime < currentTime) return false
            if (search && !event.title.toLowerCase().includes(search) && !event.description.toLowerCase().includes(search)) return false
            if (start !== null && scheduledTime < start) return false
            if (end !== null && scheduledTime > end) return false
            if (minTracks !== null && trackCount < minTracks) return false
            if (maxTracks !== null && trackCount > maxTracks) return false
            if (minCues !== null && cueCount < minCues) return false
            if (maxCues !== null && cueCount > maxCues) return false
            if (minDuration !== null && event.duration < minDuration) return false
            if (maxDuration !== null && event.duration > maxDuration) return false
            return true
        })

        const direction = filters.sortDirection === 'asc' ? 1 : -1
        return result.sort((a, b) => {
            if (filters.sortField === 'title') return direction * a.title.localeCompare(b.title)
            if (filters.sortField === 'duration') return direction * (a.duration - b.duration)
            if (filters.sortField === 'tracks') return direction * (getTrackCount(a, tracksByEventId) - getTrackCount(b, tracksByEventId))
            if (filters.sortField === 'cues') return direction * (getCueCount(a, tracksByEventId) - getCueCount(b, tracksByEventId))
            return direction * (getScheduledTime(a) - getScheduledTime(b))
        })
    }, [currentTime, events, filters, tracksByEventId])

    function setSearch(search: string) {
        setFilters((current) => ({ ...current, search }))
    }

    function setIncludePast(includePast: boolean) {
        setFilters((current) => ({ ...current, includePast }))
    }

    function setDateRange(start: string, end: string) {
        setFilters((current) => ({ ...current, dateRange: { start, end } }))
    }

    function setTrackCount(min: string, max: string) {
        setFilters((current) => ({ ...current, trackCount: { min, max } }))
    }

    function setCueCount(min: string, max: string) {
        setFilters((current) => ({ ...current, cueCount: { min, max } }))
    }

    function setDuration(min: string, max: string) {
        setFilters((current) => ({ ...current, duration: { min, max } }))
    }

    function setSort(sortField: EventRunSortField, sortDirection: EventRunSortDirection) {
        setFilters((current) => ({ ...current, sortField, sortDirection }))
    }

    function reset() {
        setFilters(defaultFilters)
    }

    const hasActiveFilters = filters.includePast ||
        filters.dateRange.start !== '' ||
        filters.dateRange.end !== '' ||
        filters.trackCount.min !== '' ||
        filters.trackCount.max !== '' ||
        filters.cueCount.min !== '' ||
        filters.cueCount.max !== '' ||
        filters.duration.min !== '' ||
        filters.duration.max !== ''

    return {
        filters,
        filtered,
        hasActiveFilters,
        setSearch,
        setIncludePast,
        setDateRange,
        setTrackCount,
        setCueCount,
        setDuration,
        setSort,
        reset,
    }
}
