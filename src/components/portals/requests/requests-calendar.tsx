import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { RequestDetailPanel } from './request-detail-panel'
import type { CultureRequest } from '@/types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-600',
}

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const grid: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) grid.push(null)
  for (let d = 1; d <= daysInMonth; d++) grid.push(d)
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

  function handleClosePanel() {
    setSelected(null)
  }

  const grid = getMonthGrid(year, month)
  const today = todayKey()
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const byDate = new Map<string, CultureRequest[]>()
  for (const req of requests) {
    if (!req.due_date) continue
    const key = req.due_date.slice(0, 10)
    const existing = byDate.get(key)
    if (existing) existing.push(req)
    else byDate.set(key, [req])
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border-primary bg-background-primary">
        <div className="flex items-center justify-between border-b border-border-secondary px-4 py-3">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-text-primary">{monthLabel}</span>
          <button
            onClick={handleNextMonth}
            className="rounded-lg p-1.5 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-border-secondary">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-xs font-medium text-text-quaternary"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const dateKey = day ? toDateKey(year, month, day) : null
            const dayRequests = dateKey ? (byDate.get(dateKey) ?? []) : []
            const isToday = dateKey === today

            return (
              <div
                key={i}
                className={`min-h-20 border-b border-r border-border-tertiary p-1 last:border-r-0 ${
                  !day ? 'bg-background-secondary' : ''
                }`}
              >
                {day && (
                  <>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-background-brand_solid text-static-white'
                          : 'text-text-secondary'
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {dayRequests.slice(0, 2).map((req) => {
                        function handleCardClick() {
                          setSelected(req)
                        }
                        const colorClass = STATUS_COLORS[req.status] ?? 'bg-background-tertiary text-text-secondary'
                        return (
                          <button
                            key={req.id}
                            onClick={handleCardClick}
                            className={`block w-full truncate rounded px-1 py-0.5 text-left text-xs transition-opacity hover:opacity-80 ${colorClass}`}
                          >
                            {req.title}
                          </button>
                        )
                      })}
                      {dayRequests.length > 2 && (
                        <span className="pl-1 text-xs text-text-tertiary">
                          +{dayRequests.length - 2} more
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <RequestDetailPanel selected={selected} onClose={handleClosePanel} />
    </>
  )
}
