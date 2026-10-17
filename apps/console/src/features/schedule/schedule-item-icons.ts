import { ClipboardList, MapPin, PackageCheck, PackageOpen, type LucideIcon } from 'lucide-react'
import type { ScheduleItemKind } from './schedule-types'

export const scheduleItemIcons: Record<ScheduleItemKind, LucideIcon> = {
  request: ClipboardList,
  venue: MapPin,
  'equipment-checkout': PackageOpen,
  'equipment-return': PackageCheck,
}
