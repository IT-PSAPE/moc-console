import { Package, CheckCircle, ArrowUpFromLine, Wrench } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { useEquipment, useEquipmentCheckouts } from '@/hooks/use-equipment'

export function EquipmentDashboard() {
  const { data: equipment = [] } = useEquipment()
  const { data: checkouts = [] } = useEquipmentCheckouts()

  const totalItems = equipment.reduce((sum, item) => sum + item.quantity, 0)
  const inStorage = equipment.reduce((sum, item) => sum + item.quantity_available, 0)
  const checkedOut = totalItems - inStorage
  const activeCheckouts = checkouts.filter((checkout) => !checkout.returned_at).length
  const inMaintenance = equipment.filter((item) => item.status === 'maintenance').length

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Items" value={totalItems} icon={Package} accent="blue" />
      <StatCard label="In Storage" value={inStorage} icon={CheckCircle} accent="emerald" />
      <StatCard label="Checked Out" value={checkedOut} icon={ArrowUpFromLine} accent="purple" />
      <StatCard label="Checkout Logs" value={activeCheckouts} icon={ArrowUpFromLine} accent="blue" />
      <StatCard label="Maintenance" value={inMaintenance} icon={Wrench} accent="amber" />
    </div>
  )
}
