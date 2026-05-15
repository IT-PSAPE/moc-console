export type EquipmentCategory = 'camera' | 'lens' | 'lighting' | 'audio' | 'support' | 'monitor' | 'cable' | 'accessory'
export type EquipmentStatus = 'available' | 'booked' | 'booked_out' | 'maintenance'

export type PublicEquipmentItem = {
  id: string
  name: string
  serialNumber: string
  category: EquipmentCategory
  status: EquipmentStatus
  location: string
  notes: string | null
  thumbnailUrl: string | null
  isAvailable: boolean
}
