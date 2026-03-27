import { useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCheckoutEquipment } from '@/hooks/use-equipment'
import type { Equipment } from '@/types'

interface EquipmentCheckoutFormProps {
  equipment: Equipment | null
  onClose: () => void
  open: boolean
}

export function EquipmentCheckoutForm({ equipment, onClose, open }: EquipmentCheckoutFormProps) {
  const [checkedOutBy, setCheckedOutBy] = useState('')
  const [destination, setDestination] = useState(equipment?.location ?? '')
  const [quantity, setQuantity] = useState('1')
  const [checkedOutAt, setCheckedOutAt] = useState(() => new Date().toISOString().slice(0, 16))
  const { mutateAsync: checkoutEquipment } = useCheckoutEquipment()

  function handleCheckedOutByChange(event: ChangeEvent<HTMLInputElement>) {
    setCheckedOutBy(event.target.value)
  }

  function handleDestinationChange(event: ChangeEvent<HTMLInputElement>) {
    setDestination(event.target.value)
  }

  function handleQuantityChange(event: ChangeEvent<HTMLInputElement>) {
    setQuantity(event.target.value)
  }

  function handleCheckedOutAtChange(event: ChangeEvent<HTMLInputElement>) {
    setCheckedOutAt(event.target.value)
  }

  async function handleSubmit() {
    if (!equipment) {
      return
    }

    const parsedQuantity = Number(quantity)
    if (!checkedOutBy.trim() || !destination.trim() || !Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      return
    }

    await checkoutEquipment({
      checked_out_at: new Date(checkedOutAt).toISOString(),
      checked_out_by: checkedOutBy.trim(),
      destination: destination.trim(),
      equipment_id: equipment.id,
      quantity: parsedQuantity,
    })

    onClose()
  }

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>Log Equipment Checkout</Modal.Header>
      <Modal.Body>
        {equipment && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border-secondary bg-background-secondary px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">{equipment.name}</p>
              <p className="mt-1 text-sm text-text-tertiary">
                {equipment.quantity_available} of {equipment.quantity} currently in storage
              </p>
            </div>
            <Input id="equipment-checkout-person" label="Collected By" onChange={handleCheckedOutByChange} placeholder="Name of collector" value={checkedOutBy} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="equipment-checkout-destination" label="Destination" onChange={handleDestinationChange} placeholder="Where the item is going" value={destination} />
              <Input id="equipment-checkout-quantity" label="Quantity" max={equipment.quantity_available} min={1} onChange={handleQuantityChange} type="number" value={quantity} />
            </div>
            <Input id="equipment-checkout-date" label="Date / Time" onChange={handleCheckedOutAtChange} type="datetime-local" value={checkedOutAt} />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} size="sm" variant="secondary">Cancel</Button>
        <Button onClick={handleSubmit} size="sm">
          Confirm Checkout
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
