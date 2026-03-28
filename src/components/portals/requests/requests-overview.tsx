import { useState } from 'react'
import { FileText, CheckCircle, Archive, Loader } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { RequestDetailPanel } from './request-detail-panel'
import { useRequests } from '@/hooks/use-requests'
import { formatDate } from '@/lib/utils'
import type { CultureRequest } from '@/types'

function isOverdue(request: CultureRequest): boolean {
  return Boolean(request.due_date && new Date(request.due_date) < new Date())
}

function sortByDueDateWithOverdueFirst(a: CultureRequest, b: CultureRequest): number {
  const aOverdue = isOverdue(a)
  const bOverdue = isOverdue(b)

  // Overdue items always come first
  if (aOverdue && !bOverdue) return -1
  if (!aOverdue && bOverdue) return 1

  // Within same group, sort by due date ascending (earliest first)
  const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity
  const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity
  return aDate - bDate
}

export function RequestsOverview() {
  const { data: requests = [] } = useRequests()
  const [selected, setSelected] = useState<CultureRequest | null>(null)

  const total = requests.length
  const completed = requests.filter((r) => r.status === 'completed').length
  const archived = requests.filter((r) => r.archived).length
  const inProgress = requests.filter((r) => r.status === 'in_review' || r.status === 'approved').length

  // Active requests: not completed, not archived
  const activeRequests = requests
    .filter((r) => r.status !== 'completed' && !r.archived)
    .sort(sortByDueDateWithOverdueFirst)

  return (
    <>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Requests" value={total} icon={FileText} accent="blue" />
        <StatCard label="Completed" value={completed} icon={CheckCircle} accent="emerald" />
        <StatCard label="Archived" value={archived} icon={Archive} accent="purple" />
        <StatCard label="In Progress" value={inProgress} icon={Loader} accent="amber" />
      </div>

      {/* Active Request Queue */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-text-secondary">Active Requests</h3>

        {activeRequests.length === 0 ? (
          <div className="rounded-xl border border-border-secondary bg-background-secondary px-5 py-8 text-center">
            <p className="text-sm text-text-tertiary">No active requests right now.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeRequests.map((request) => {
              const overdue = isOverdue(request)
              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setSelected(request)}
                  className={`w-full rounded-xl border bg-background-primary px-5 py-4 text-left transition-colors hover:bg-background-secondary ${
                    overdue ? 'border-utility-error-300' : 'border-border-secondary'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {overdue && (
                          <span className="shrink-0 rounded bg-utility-error-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-utility-error-700">
                            Overdue
                          </span>
                        )}
                        <p className="truncate text-sm font-medium text-text-primary">{request.title}</p>
                      </div>
                      <p className="text-xs text-text-tertiary">{request.who}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={request.status} />
                      <StatusBadge status={request.priority} />
                      <span className="text-xs text-text-quaternary">
                        {request.due_date ? formatDate(request.due_date) : 'No due date'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <RequestDetailPanel selected={selected} onClose={() => setSelected(null)} />
    </>
  )
}
