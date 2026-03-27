import { Routes, Route, Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { EquipmentDashboard } from './equipment-dashboard'
import { EquipmentList } from './equipment-list'

export function EquipmentPortal() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description="Manage inventory, assignments, and maintenance"
        actions={
          <Button size="sm" icon={<Plus className="h-4 w-4" />}>
            Add Equipment
          </Button>
        }
      />
      <Routes>
        <Route index element={
          <>
            <EquipmentDashboard />
            <div className="mt-6">
              <EquipmentList />
            </div>
          </>
        } />
        <Route path="inventory" element={<EquipmentList />} />
        <Route path="assignments" element={<EquipmentList statusFilter="assigned" />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </div>
  )
}
