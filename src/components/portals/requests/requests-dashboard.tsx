import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { useRequests } from '@/hooks/use-requests'

export function RequestsDashboard() {
  const { data: requests = [] } = useRequests()

  const total = requests.length
  const inReview = requests.filter((r) => r.status === 'in_review').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const overdue = requests.filter((r) => r.due_date && r.status !== 'completed' && new Date(r.due_date) < new Date()).length

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Requests" value={total} icon={FileText} accent="blue" />
      <StatCard label="In Review" value={inReview} icon={Clock} accent="amber" />
      <StatCard label="Approved" value={approved} icon={CheckCircle} accent="emerald" />
      <StatCard label="Overdue" value={overdue} icon={XCircle} accent="red" />
    </div>
  )
}
