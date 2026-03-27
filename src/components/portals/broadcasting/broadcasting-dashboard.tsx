import { Radio, Calendar, PlayCircle, Eye } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { mockBroadcasts } from '@/lib/mock-broadcasts'

export function BroadcastingDashboard() {
  const live = mockBroadcasts.filter((b) => b.status === 'live').length
  const scheduled = mockBroadcasts.filter((b) => b.status === 'scheduled').length
  const completed = mockBroadcasts.filter((b) => b.status === 'completed').length
  const totalViewers = mockBroadcasts.reduce((sum, b) => sum + (b.viewer_count ?? 0), 0)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Live Now" value={live} icon={Radio} accent="red" />
      <StatCard label="Scheduled" value={scheduled} icon={Calendar} accent="purple" />
      <StatCard label="Completed" value={completed} icon={PlayCircle} accent="emerald" />
      <StatCard label="Total Viewers" value={totalViewers.toLocaleString()} icon={Eye} accent="blue" />
    </div>
  )
}
