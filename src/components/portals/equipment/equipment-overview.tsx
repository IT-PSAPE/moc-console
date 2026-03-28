import { Package, CheckCircle, CalendarClock, AlertTriangle, Clock } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useEquipment, useBookings, useIssues } from '@/hooks/use-equipment'
import { formatDate, formatDateTime } from '@/lib/utils'

function isOverdue(booking: { status: string; end_date: string }): boolean {
  return booking.status === 'in_use' && new Date(booking.end_date) < new Date()
}

export function EquipmentOverview() {
  const { data: equipment = [] } = useEquipment()
  const { data: bookings = [] } = useBookings()
  const { data: issues = [] } = useIssues()

  const totalEquipment = equipment.reduce((sum, item) => sum + item.quantity, 0)
  const availableCount = equipment.reduce((sum, item) => sum + item.quantity_available, 0)
  const inUseCount = bookings.filter((b) => b.status === 'in_use').reduce((sum, b) => sum + b.quantity, 0)
  const faultyCount = equipment.filter((item) => item.status === 'faulty').length

  const overdueBookings = bookings.filter((b) => isOverdue(b))
  const upcomingBookings = bookings
    .filter((b) => b.status === 'booked')
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 5)
  const activeIssues = issues.filter((i) => i.status === 'active').slice(0, 5)

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Equipment" value={totalEquipment} icon={Package} accent="blue" />
        <StatCard label="Available" value={availableCount} icon={CheckCircle} accent="emerald" />
        <StatCard label="In Use" value={inUseCount} icon={CalendarClock} accent="purple" />
        <StatCard label="Faulty" value={faultyCount} icon={AlertTriangle} accent="red" />
      </div>

      {/* Overdue Returns */}
      {overdueBookings.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-utility-error-700">Overdue Returns</h3>
          <div className="space-y-2">
            {overdueBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-utility-error-300 bg-background-primary px-5 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-utility-error-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-utility-error-700">
                        Overdue
                      </span>
                      <p className="truncate text-sm font-medium text-text-primary">{booking.equipment_name}</p>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {booking.assigned_to} — {booking.event ?? 'No event'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-text-quaternary">
                      Due {formatDate(booking.end_date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Bookings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">Upcoming Bookings</h3>
        {upcomingBookings.length === 0 ? (
          <div className="rounded-xl border border-border-secondary bg-background-secondary px-5 py-8 text-center">
            <p className="text-sm text-text-tertiary">No upcoming bookings.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl border border-border-secondary bg-background-primary px-5 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-text-primary">{booking.equipment_name}</p>
                    <p className="text-xs text-text-tertiary">
                      {booking.assigned_to}{booking.event ? ` — ${booking.event}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={booking.status} />
                    <span className="inline-flex items-center gap-1.5 text-xs text-text-quaternary">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(booking.start_date)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Reported Issues */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">Recently Reported Issues</h3>
        {activeIssues.length === 0 ? (
          <div className="rounded-xl border border-border-secondary bg-background-secondary px-5 py-8 text-center">
            <p className="text-sm text-text-tertiary">No active issues.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeIssues.map((issue) => (
              <div
                key={issue.id}
                className="rounded-xl border border-border-secondary bg-background-primary px-5 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium text-text-primary">{issue.equipment_name}</p>
                    <p className="line-clamp-1 text-xs text-text-tertiary">{issue.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={issue.status} />
                    <span className="text-xs text-text-quaternary">
                      {formatDate(issue.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
