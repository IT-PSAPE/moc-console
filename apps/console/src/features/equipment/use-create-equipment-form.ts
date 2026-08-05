import { useCallback, useState, type ChangeEvent } from 'react'
import type { EquipmentCategory } from '@moc/types/equipment'

type EquipmentDraft = {
  name: string
  serialNumber: string
  category: EquipmentCategory
  location: string
}

const initialState: EquipmentDraft = { name: '', serialNumber: '', category: 'camera', location: '' }

export function useCreateEquipmentForm(onCreate: (equipment: EquipmentDraft) => void, onOpenChange: (open: boolean) => void) {
  const [form, setForm] = useState(initialState)
  const reset = useCallback(() => setForm(initialState), [])
  const canSubmit = form.name.trim().length > 0 && form.serialNumber.trim().length > 0

  function changeName(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, name: event.target.value }))
  }

  function changeSerialNumber(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, serialNumber: event.target.value }))
  }

  function changeCategory(category: EquipmentCategory | null) {
    if (category !== null) setForm((current) => ({ ...current, category }))
  }

  function changeLocation(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, location: event.target.value }))
  }

  function changeOpen(open: boolean) {
    onOpenChange(open)
    if (!open) reset()
  }

  function submit() {
    if (!canSubmit) return
    onCreate({ name: form.name.trim(), serialNumber: form.serialNumber.trim(), category: form.category, location: form.location.trim() })
    reset()
  }

  return { state: { form, canSubmit }, actions: { changeName, changeSerialNumber, changeCategory, changeLocation, changeOpen, submit } }
}
