import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { useRequests } from '@/hooks/use-requests'

export function RequestsDashboard() {
  const { data: requests = [] } = useRequests()

  const total = requests.length
  const pending = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Requests" value={total} icon={FileText} accent="blue" />
      <StatCard label="Pending" value={pending} icon={Clock} accent="amber" />
      <StatCard label="Approved" value={approved} icon={CheckCircle} accent="emerald" />
      <StatCard label="Rejected" value={rejected} icon={XCircle} accent="red" />
    </div>
  )
}
