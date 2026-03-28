import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockBookings, mockEquipment, mockIssues } from '@/lib/mock-equipment'
import type { BookingStatus, Equipment, EquipmentBooking, EquipmentIssue, EquipmentStatus, IssueStatus } from '@/types'

// ── Form value types ─────────────────────────────────────────

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

export interface BookingFormValues {
  equipment_id: string
  quantity: number
  booked_by: string
  assigned_to: string
  event: string
  start_date: string
  end_date: string
  notes: string
}

export interface IssueFormValues {
  equipment_id: string
  description: string
  reported_by: string
}

// ── Fetch functions ──────────────────────────────────────────

function fetchEquipment(): Promise<Equipment[]> {
  return Promise.resolve([...mockEquipment])
}

function fetchBookings(): Promise<EquipmentBooking[]> {
  return Promise.resolve(
    [...mockBookings].sort((a, b) => a.start_date.localeCompare(b.start_date)),
  )
}

function fetchIssues(): Promise<EquipmentIssue[]> {
  return Promise.resolve(
    [...mockIssues].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  )
}

// ── Mutation helpers ─────────────────────────────────────────

function getEquipmentRecord(equipmentId: string) {
  const record = mockEquipment.find((item) => item.id === equipmentId)
  if (!record) {
    throw new Error(`Equipment ${equipmentId} not found`)
  }
  return record
}

function syncEquipmentStatus(record: Equipment) {
  const hasActiveIssue = mockIssues.some(
    (issue) => issue.equipment_id === record.id && issue.status === 'active',
  )

  if (hasActiveIssue) {
    record.status = 'faulty'
    return
  }

  const activeBookings = mockBookings.filter(
    (b) => b.equipment_id === record.id && b.status !== 'returned',
  )

  const inUse = activeBookings.some((b) => b.status === 'in_use')
  const booked = activeBookings.some((b) => b.status === 'booked')

  if (inUse) {
    record.status = 'in_use'
  } else if (booked) {
    record.status = 'booked'
  } else {
    record.status = 'available'
  }
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

  syncEquipmentStatus(record)

  return Promise.resolve(record)
}

function createBooking(values: BookingFormValues): Promise<EquipmentBooking> {
  const record = getEquipmentRecord(values.equipment_id)

  if (record.status === 'faulty') {
    throw new Error('This item has active issues and cannot be booked')
  }

  if (values.quantity < 1 || values.quantity > record.quantity_available) {
    throw new Error('Requested quantity exceeds available items')
  }

  record.quantity_available -= values.quantity

  const booking: EquipmentBooking = {
    id: `bk-${Date.now()}`,
    equipment_id: record.id,
    equipment_name: record.name,
    quantity: values.quantity,
    status: 'booked',
    booked_by: values.booked_by,
    assigned_to: values.assigned_to,
    event: values.event || undefined,
    start_date: new Date(values.start_date).toISOString(),
    end_date: new Date(values.end_date).toISOString(),
    notes: values.notes || undefined,
    created_at: new Date().toISOString(),
  }

  mockBookings.unshift(booking)
  syncEquipmentStatus(record)

  return Promise.resolve(booking)
}

function updateBookingStatus(values: { id: string; status: BookingStatus }): Promise<EquipmentBooking> {
  const booking = mockBookings.find((b) => b.id === values.id)
  if (!booking) {
    throw new Error(`Booking ${values.id} not found`)
  }

  const prevStatus = booking.status
  booking.status = values.status

  if (values.status === 'returned' && prevStatus !== 'returned') {
    const record = getEquipmentRecord(booking.equipment_id)
    record.quantity_available = Math.min(record.quantity, record.quantity_available + booking.quantity)
    syncEquipmentStatus(record)
  }

  if (values.status === 'in_use' && prevStatus === 'booked') {
    const record = getEquipmentRecord(booking.equipment_id)
    record.assigned_to = booking.assigned_to
    syncEquipmentStatus(record)
  }

  return Promise.resolve(booking)
}

function createIssue(values: IssueFormValues): Promise<EquipmentIssue> {
  const record = getEquipmentRecord(values.equipment_id)

  const issue: EquipmentIssue = {
    id: `iss-${Date.now()}`,
    equipment_id: record.id,
    equipment_name: record.name,
    description: values.description,
    reported_by: values.reported_by,
    status: 'active',
    created_at: new Date().toISOString(),
  }

  mockIssues.unshift(issue)
  syncEquipmentStatus(record)

  return Promise.resolve(issue)
}

function updateIssueStatus(values: { id: string; status: IssueStatus }): Promise<EquipmentIssue> {
  const issue = mockIssues.find((i) => i.id === values.id)
  if (!issue) {
    throw new Error(`Issue ${values.id} not found`)
  }

  issue.status = values.status
  if (values.status === 'resolved') {
    issue.resolved_at = new Date().toISOString()
  }

  const record = getEquipmentRecord(issue.equipment_id)
  syncEquipmentStatus(record)

  return Promise.resolve(issue)
}

// ── Invalidation helper ──────────────────────────────────────

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.equipment.all })
}

// ── Query hooks ──────────────────────────────────────────────

export function useEquipment() {
  return useQuery({
    queryKey: queryKeys.equipment.list(),
    queryFn: fetchEquipment,
  })
}

export function useBookings() {
  return useQuery({
    queryKey: queryKeys.equipment.bookings(),
    queryFn: fetchBookings,
  })
}

export function useIssues() {
  return useQuery({
    queryKey: queryKeys.equipment.issues(),
    queryFn: fetchIssues,
  })
}

// ── Mutation hooks ───────────────────────────────────────────

export function useCreateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEquipment,
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEquipment,
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBookingStatus,
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createIssue,
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateIssueStatus,
    onSuccess: () => invalidateAll(queryClient),
  })
}
