import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EquipmentOverview } from './equipment-overview'
import { EquipmentInventory } from './equipment-inventory'
import { EquipmentBookings } from './equipment-bookings'
import { EquipmentMaintenance } from './equipment-maintenance'
import { EquipmentReports } from './equipment-reports'
import { EquipmentForm } from './equipment-form'
import { EquipmentBookingForm } from './equipment-booking-form'
import { EquipmentIssueForm } from './equipment-issue-form'
import type { Equipment } from '@/types'

export function EquipmentPortal() {
  const [formOpen, setFormOpen] = useState(false)
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null)
  const [bookingFormOpen, setBookingFormOpen] = useState(false)
  const [bookingEquipment, setBookingEquipment] = useState<Equipment | null>(null)
  const [issueFormOpen, setIssueFormOpen] = useState(false)
  const [issueEquipment, setIssueEquipment] = useState<Equipment | null>(null)

  function handleAddEquipment() {
    setEditEquipment(null)
    setFormOpen(true)
  }

  function handleEditEquipment(equipment: Equipment) {
    setEditEquipment(equipment)
    setFormOpen(true)
  }

  function handleCloseForm() {
    setFormOpen(false)
    setEditEquipment(null)
  }

  function handleOpenBookingForm(equipment?: Equipment) {
    setBookingEquipment(equipment ?? null)
    setBookingFormOpen(true)
  }

  function handleCloseBookingForm() {
    setBookingFormOpen(false)
    setBookingEquipment(null)
  }

  function handleOpenIssueForm(equipment?: Equipment) {
    setIssueEquipment(equipment ?? null)
    setIssueFormOpen(true)
  }

  function handleCloseIssueForm() {
    setIssueFormOpen(false)
    setIssueEquipment(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description="Manage equipment inventory, bookings, and maintenance across the department."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleAddEquipment} size="sm">
            Add Equipment
          </Button>
        }
      />

      <Routes>
        <Route index element={<EquipmentOverview />} />
        <Route path="inventory" element={<EquipmentInventory onBookEquipment={handleOpenBookingForm} onEditEquipment={handleEditEquipment} onReportIssue={handleOpenIssueForm} />} />
        <Route path="bookings" element={<EquipmentBookings onNewBooking={() => handleOpenBookingForm()} />} />
        <Route path="maintenance" element={<EquipmentMaintenance onReportIssue={() => handleOpenIssueForm()} />} />
        <Route path="reports" element={<EquipmentReports />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>

      <EquipmentForm
        equipment={editEquipment}
        key={`${editEquipment?.id ?? 'new'}-${formOpen ? 'open' : 'closed'}`}
        onClose={handleCloseForm}
        open={formOpen}
      />
      <EquipmentBookingForm
        equipment={bookingEquipment}
        key={`booking-${bookingEquipment?.id ?? 'any'}-${bookingFormOpen ? 'open' : 'closed'}`}
        onClose={handleCloseBookingForm}
        open={bookingFormOpen}
      />
      <EquipmentIssueForm
        equipment={issueEquipment}
        key={`issue-${issueEquipment?.id ?? 'any'}-${issueFormOpen ? 'open' : 'closed'}`}
        onClose={handleCloseIssueForm}
        open={issueFormOpen}
      />
    </div>
  )
}
