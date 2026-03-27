import { Package, CheckCircle, Wrench, Archive } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { mockEquipment } from '@/lib/mock-equipment'

export function EquipmentDashboard() {
  const total = mockEquipment.length
  const available = mockEquipment.filter((e) => e.status === 'available').length
  const inMaintenance = mockEquipment.filter((e) => e.status === 'maintenance').length
  const assigned = mockEquipment.filter((e) => e.status === 'assigned').length

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Equipment" value={total} icon={Package} accent="blue" />
      <StatCard label="Available" value={available} icon={CheckCircle} accent="emerald" />
      <StatCard label="Assigned" value={assigned} icon={Archive} accent="purple" />
      <StatCard label="Maintenance" value={inMaintenance} icon={Wrench} accent="amber" />
    </div>
  )
}
