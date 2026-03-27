import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockCheckouts, mockEquipment } from '@/lib/mock-equipment'
import type { Equipment, EquipmentCheckout, EquipmentStatus } from '@/types'

export interface EquipmentFormValues {
  category: string
  condition: Equipment['condition']
  description: string
  image_url: string
  location: string
  name: string
  quantity: number
  serial_number: string
  status: EquipmentStatus
}

export interface EquipmentCheckoutValues {
  checked_out_at: string
  checked_out_by: string
  destination: string
  equipment_id: string
  quantity: number
}

function fetchEquipment(): Promise<Equipment[]> {
  return Promise.resolve([...mockEquipment])
}

function fetchEquipmentCheckouts(): Promise<EquipmentCheckout[]> {
  return Promise.resolve([...mockCheckouts].sort((a, b) => b.checked_out_at.localeCompare(a.checked_out_at)))
}

function updateEquipmentState(record: Equipment) {
  if (record.status === 'maintenance' || record.status === 'retired') {
    return
  }

  record.status = record.quantity_available < record.quantity ? 'assigned' : 'available'

  if (record.quantity_available === record.quantity) {
    record.assigned_to = undefined
  }
}

function getEquipmentRecord(equipmentId: string) {
  const record = mockEquipment.find((item) => item.id === equipmentId)
  if (!record) {
    throw new Error(`Equipment ${equipmentId} not found`)
  }
  return record
}

function createEquipment(values: EquipmentFormValues): Promise<Equipment> {
  const now = new Date().toISOString()
  const newEquipment: Equipment = {
    ...values,
    description: values.description || undefined,
    image_url: values.image_url || undefined,
    id: `equipment-${Date.now()}`,
    quantity_available: values.quantity,
    created_at: now,
  }

  mockEquipment.unshift(newEquipment)
  return Promise.resolve(newEquipment)
}

function updateEquipment(values: { id: string; changes: EquipmentFormValues }): Promise<Equipment> {
  const record = getEquipmentRecord(values.id)
  const nextQuantityAvailable = Math.min(record.quantity_available, values.changes.quantity)

  Object.assign(record, {
    ...values.changes,
    description: values.changes.description || undefined,
    image_url: values.changes.image_url || undefined,
    quantity_available: nextQuantityAvailable,
  })

  updateEquipmentState(record)

  return Promise.resolve(record)
}

function checkoutEquipment(values: EquipmentCheckoutValues): Promise<EquipmentCheckout> {
  const record = getEquipmentRecord(values.equipment_id)

  if (record.status === 'maintenance' || record.status === 'retired') {
    throw new Error('This item is not available for checkout')
  }

  if (values.quantity < 1 || values.quantity > record.quantity_available) {
    throw new Error('Requested quantity exceeds items in storage')
  }

  record.quantity_available -= values.quantity
  record.assigned_to = values.checked_out_by
  updateEquipmentState(record)

  const checkout: EquipmentCheckout = {
    id: `checkout-${Date.now()}`,
    equipment_id: record.id,
    equipment_name: record.name,
    quantity: values.quantity,
    checked_out_by: values.checked_out_by,
    destination: values.destination,
    checked_out_at: values.checked_out_at,
  }

  mockCheckouts.unshift(checkout)
  return Promise.resolve(checkout)
}

function returnEquipmentCheckout(checkoutId: string): Promise<void> {
  const checkout = mockCheckouts.find((item) => item.id === checkoutId)

  if (!checkout || checkout.returned_at) {
    return Promise.resolve()
  }

  const record = getEquipmentRecord(checkout.equipment_id)
  record.quantity_available = Math.min(record.quantity, record.quantity_available + checkout.quantity)
  checkout.returned_at = new Date().toISOString()
  updateEquipmentState(record)

  return Promise.resolve()
}

function invalidateEquipment(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all }),
  ])
}

export function useEquipment() {
  return useQuery({
    queryKey: queryKeys.equipment.list(),
    queryFn: fetchEquipment,
  })
}

export function useEquipmentCheckouts() {
  return useQuery({
    queryKey: queryKeys.equipment.checkouts(),
    queryFn: fetchEquipmentCheckouts,
  })
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEquipment,
    onSuccess: () => invalidateEquipment(queryClient),
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEquipment,
    onSuccess: () => invalidateEquipment(queryClient),
  })
}

export function useCheckoutEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: checkoutEquipment,
    onSuccess: () => invalidateEquipment(queryClient),
  })
}

export function useReturnEquipmentCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: returnEquipmentCheckout,
    onSuccess: () => invalidateEquipment(queryClient),
  })
}
