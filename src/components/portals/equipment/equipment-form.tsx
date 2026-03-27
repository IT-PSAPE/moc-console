import { useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useCreateEquipment, useUpdateEquipment, type EquipmentFormValues } from '@/hooks/use-equipment'
import type { Equipment } from '@/types'

interface EquipmentFormProps {
  equipment?: Equipment | null
  onClose: () => void
  open: boolean
}

const DEFAULT_FORM_VALUES: EquipmentFormValues = {
  category: 'Audio',
  condition: 'excellent',
  description: '',
  image_url: '',
  location: '',
  name: '',
  quantity: 1,
  serial_number: '',
  status: 'available',
}

function getInitialValues(equipment?: Equipment | null): EquipmentFormValues {
  if (!equipment) {
    return DEFAULT_FORM_VALUES
  }

  return {
    category: equipment.category,
    condition: equipment.condition,
    description: equipment.description ?? '',
    image_url: equipment.image_url ?? '',
    location: equipment.location,
    name: equipment.name,
    quantity: equipment.quantity,
    serial_number: equipment.serial_number,
    status: equipment.status,
  }
}

export function EquipmentForm({ equipment, onClose, open }: EquipmentFormProps) {
  const isEdit = Boolean(equipment)
  const [form, setForm] = useState<EquipmentFormValues>(() => getInitialValues(equipment))
  const { mutateAsync: createEquipment } = useCreateEquipment()
  const { mutateAsync: updateEquipment } = useUpdateEquipment()

  function setField<Key extends keyof EquipmentFormValues>(key: Key, value: EquipmentFormValues[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setField('name', event.target.value)
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setField('description', event.target.value)
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setField('category', event.target.value)
  }

  function handleConditionChange(event: ChangeEvent<HTMLSelectElement>) {
    setField('condition', event.target.value as Equipment['condition'])
  }

  function handleSerialNumberChange(event: ChangeEvent<HTMLInputElement>) {
    setField('serial_number', event.target.value)
  }

  function handleLocationChange(event: ChangeEvent<HTMLInputElement>) {
    setField('location', event.target.value)
  }

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    setField('status', event.target.value as Equipment['status'])
  }

  function handleQuantityChange(event: ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value)
    setField('quantity', Number.isFinite(value) && value > 0 ? value : 1)
  }

  function handleImageUrlChange(event: ChangeEvent<HTMLInputElement>) {
    setField('image_url', event.target.value)
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.serial_number.trim() || !form.location.trim()) {
      return
    }

    if (equipment) {
      await updateEquipment({ id: equipment.id, changes: form })
    } else {
      await createEquipment(form)
    }

    onClose()
  }

  return (
    <Modal.Root open={open} onClose={onClose}>
      <Modal.Header>{isEdit ? 'Edit Equipment' : 'Add Equipment'}</Modal.Header>
      <Modal.Body>
        <div className="space-y-4">
          <Input id="equipment-name" label="Name" onChange={handleNameChange} placeholder="Equipment name" value={form.name} />
          <TextArea id="equipment-description" label="Description" onChange={handleDescriptionChange} placeholder="Brief description" value={form.description} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="equipment-category" label="Category" onChange={handleCategoryChange} value={form.category}>
              <option value="Audio">Audio</option>
              <option value="Lighting">Lighting</option>
              <option value="Visual">Visual</option>
              <option value="Video">Video</option>
              <option value="Staging">Staging</option>
            </Select>
            <Select id="equipment-condition" label="Condition" onChange={handleConditionChange} value={form.condition}>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="equipment-serial-number" label="Serial Number" onChange={handleSerialNumberChange} placeholder="XX-YYYY-ZZZ" value={form.serial_number} />
            <Input id="equipment-location" label="Storage Location" onChange={handleLocationChange} placeholder="Warehouse A" value={form.location} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="equipment-quantity" label="Total Quantity" min={1} onChange={handleQuantityChange} type="number" value={String(form.quantity)} />
            <Select id="equipment-status" label="Status" onChange={handleStatusChange} value={form.status}>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </Select>
          </div>

          <Input id="equipment-image-url" label="Image URL" onChange={handleImageUrlChange} placeholder="https://..." value={form.image_url} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose} size="sm" variant="secondary">Cancel</Button>
        <Button onClick={handleSubmit} size="sm" variant="primary">
          {isEdit ? 'Save Changes' : 'Add Equipment'}
        </Button>
      </Modal.Footer>
    </Modal.Root>
  )
}
