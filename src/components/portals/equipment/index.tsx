import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs } from '@/components/ui/tabs'
import { EquipmentCheckoutForm } from './equipment-checkout-form'
import { EquipmentCheckouts } from './equipment-checkouts'
import { EquipmentDashboard } from './equipment-dashboard'
import { EquipmentForm } from './equipment-form'
import { EquipmentInventory } from './equipment-inventory'
import type { Equipment } from '@/types'

export function EquipmentPortal() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [checkoutEquipment, setCheckoutEquipment] = useState<Equipment | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  function handleAddEquipment() {
    setSelectedEquipment(null)
    setFormOpen(true)
  }

  function handleCloseEquipmentForm() {
    setFormOpen(false)
    setSelectedEquipment(null)
  }

  function handleEditEquipment(equipment: Equipment) {
    setSelectedEquipment(equipment)
    setFormOpen(true)
  }

  function handleOpenCheckoutForm(equipment: Equipment) {
    setCheckoutEquipment(equipment)
  }

  function handleCloseCheckoutForm() {
    setCheckoutEquipment(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={(
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleAddEquipment} size="sm">
            Add Equipment
          </Button>
        )}
        description="Track inventory, log manual collection, and see what is currently in storage or checked out."
        title="Equipment"
      />

      <EquipmentDashboard />

      <Tabs.Root defaultTab="storage">
        <Tabs.List>
          <Tabs.Trigger id="storage">In Storage</Tabs.Trigger>
          <Tabs.Trigger id="checkouts">Checked Out</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content id="storage">
          <EquipmentInventory onCheckoutEquipment={handleOpenCheckoutForm} onEditEquipment={handleEditEquipment} />
        </Tabs.Content>
        <Tabs.Content id="checkouts">
          <EquipmentCheckouts />
        </Tabs.Content>
      </Tabs.Root>

      <EquipmentForm
        equipment={selectedEquipment}
        key={`${selectedEquipment?.id ?? 'new'}-${formOpen ? 'open' : 'closed'}`}
        onClose={handleCloseEquipmentForm}
        open={formOpen}
      />
      <EquipmentCheckoutForm
        equipment={checkoutEquipment}
        key={`${checkoutEquipment?.id ?? 'checkout'}-${checkoutEquipment ? 'open' : 'closed'}`}
        onClose={handleCloseCheckoutForm}
        open={Boolean(checkoutEquipment)}
      />
    </div>
  )
}
