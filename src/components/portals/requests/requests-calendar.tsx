import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { RequestDetailPanel } from './request-detail-panel'
import type { CultureRequest } from '@/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-utility-warning-50 text-utility-warning-700',
  in_review: 'bg-utility-blue-50 text-utility-blue-700',
  approved: 'bg-utility-success-50 text-utility-success-700',
  rejected: 'bg-utility-error-50 text-utility-error-700',
  completed: 'bg-utility-gray-100 text-utility-gray-600',
}

interface CalendarDay {
  day: number
  isCurrentMonth: boolean
}

function getCalendarGrid(year: number, month: number): CalendarDay[] {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const grid: CalendarDay[] = []

  // Previous month trailing days
  for (let i = firstWeekday - 1; i >= 0; i--) {
    grid.push({ day: daysInPrevMonth - i, isCurrentMonth: false })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, isCurrentMonth: true })
  }

  // Next month leading days to fill remaining rows
  const remaining = 42 - grid.length
  for (let d = 1; d <= remaining; d++) {
    grid.push({ day: d, isCurrentMonth: false })
  }

  return grid
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayKey(): string {
  const t = new Date()
  return toDateKey(t.getFullYear(), t.getMonth(), t.getDate())
}

interface RequestsCalendarProps {
  requests: CultureRequest[]
}

export function RequestsCalendar({ requests }: RequestsCalendarProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<CultureRequest | null>(null)

  function handlePrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function handleNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  function handleToday() {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  function handleClosePanel() {
    setSelected(null)
  }

  function createRequestOpenHandler(request: CultureRequest) {
    return function handleOpenRequest() {
      setSelected(request)
    }
  }

  const grid = getCalendarGrid(year, month)
  const today = todayKey()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Build a map of date keys to requests
  const byDate = new Map<string, CultureRequest[]>()
  for (const req of requests) {
    if (!req.due_date) continue
    const key = req.due_date.slice(0, 10)
    const existing = byDate.get(key)
    if (existing) existing.push(req)
    else byDate.set(key, [req])
  }

  // Calculate date keys for prev/next month overflow cells
  function getDateKeyForCell(cell: CalendarDay, index: number): string | null {
    if (cell.isCurrentMonth) return toDateKey(year, month, cell.day)
    // Before current month days start
    if (index < 7) {
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      return toDateKey(prevYear, prevMonth, cell.day)
    }
    // After current month days end
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    return toDateKey(nextYear, nextMonth, cell.day)
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border-primary bg-background-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleToday} size="sm" variant="secondary">Today</Button>
            <IconButton icon={<ChevronLeft className="h-4 w-4" />} label="Previous month" onClick={handlePrevMonth} variant="secondary" />
            <IconButton icon={<ChevronRight className="h-4 w-4" />} label="Next month" onClick={handleNextMonth} variant="secondary" />
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-t border-border-secondary">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="border-r border-border-secondary py-2 text-center text-xs font-medium text-text-quaternary last:border-r-0"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {grid.map((cell, i) => {
            const dateKey = getDateKeyForCell(cell, i)
            const dayRequests = dateKey ? (byDate.get(dateKey) ?? []) : []
            const isToday = dateKey === today

            return (
              <div
                key={i}
                className="min-h-24 border-r border-t border-border-secondary p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0"
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? 'bg-utility-success-500 text-static-white'
                      : cell.isCurrentMonth
                        ? 'text-text-secondary'
                        : 'text-text-quaternary'
                  }`}
                >
                  {cell.day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayRequests.slice(0, 3).map((req) => {
                    const colorClass =
                      STATUS_COLORS[req.status] ?? 'bg-background-tertiary text-text-secondary'
                    return (
                      <button
                        key={req.id}
                        onClick={createRequestOpenHandler(req)}
                        className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80 ${colorClass}`}
                        type="button"
                      >
                        {req.title}
                      </button>
                    )
                  })}
                  {dayRequests.length > 3 && (
                    <span className="pl-1 text-xs text-text-tertiary">
                      +{dayRequests.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <RequestDetailPanel selected={selected} onClose={handleClosePanel} />
    </>
  )
}
