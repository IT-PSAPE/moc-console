import { useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useEquipment, useCreateBooking } from '@/hooks/use-equipment'
import type { Equipment } from '@/types'

interface EquipmentBookingFormProps {
  equipment: Equipment | null
  onClose: () => void
  open: boolean
}

export function EquipmentBookingForm({ equipment, onClose, open }: EquipmentBookingFormProps) {
  const { data: allEquipment = [] } = useEquipment()
  const { mutateAsync: createBooking } = useCreateBooking()

  const [equipmentId, setEquipmentId] = useState(equipment?.id ?? '')
  const [quantity, setQuantity] = useState('1')
  const [bookedBy, setBookedBy] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [event, setEvent] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const selectedEquipment = equipment ?? allEquipment.find((e) => e.id === equipmentId)
  const availableEquipment = allEquipment.filter((e) => e.status !== 'faulty' && e.quantity_available > 0)

  function handleEquipmentChange(e: ChangeEvent<HTMLSelectElement>) {
    setEquipmentId(e.target.value)
  }

  async function handleSubmit() {
    const targetId = equipment?.id ?? equipmentId
    if (!targetId || !bookedBy.trim() || !assignedTo.trim() || !startDate || !endDate) {
      return
    }

    await createBooking({
      equipment_id: targetId,
      quantity: Number(quantity) || 1,
      booked_by: bookedBy.trim(),
      assigned_to: assignedTo.trim(),
      event: event.trim(),
      start_date: startDate,
      end_date: endDate,
      notes: notes.trim(),
    })

    onClose()
  }

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>Book Equipment</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          {equipment ? (
            <div className="rounded-xl border border-border-secondary bg-background-secondary px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">{equipment.name}</p>
              <p className="mt-1 text-sm text-text-tertiary">
                {equipment.quantity_available} of {equipment.quantity} available
              </p>
            </div>
          ) : (
            <Select id="booking-equipment" label="Equipment" onChange={handleEquipmentChange} value={equipmentId}>
              <option value="">Select equipment...</option>
              {availableEquipment.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.quantity_available} available)
                </option>
              ))}
            </Select>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="booking-booked-by"
              label="Booked By"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBookedBy(e.target.value)}
              placeholder="Who is making the booking"
              value={bookedBy}
            />
            <Input
              id="booking-assigned-to"
              label="Assigned To"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAssignedTo(e.target.value)}
              placeholder="Person, team, or group"
              value={assignedTo}
            />
          </div>

          <Input
            id="booking-event"
            label="Event (optional)"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEvent(e.target.value)}
            placeholder="Event name"
            value={event}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="booking-start"
              label="Start Date / Time"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
              type="datetime-local"
              value={startDate}
            />
            <Input
              id="booking-end"
              label="End Date / Time"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
              type="datetime-local"
              value={endDate}
            />
          </div>

          <Input
            id="booking-quantity"
            label="Quantity"
            max={selectedEquipment?.quantity_available ?? 1}
            min={1}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
            type="number"
            value={quantity}
          />

          <TextArea
            id="booking-notes"
            label="Notes (optional)"
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Any additional details..."
            value={notes}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} size="sm" variant="secondary">Cancel</Button>
        <Button onClick={handleSubmit} size="sm" variant="primary">Confirm Booking</Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
