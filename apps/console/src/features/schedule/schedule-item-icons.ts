import { ClipboardList, MapPin, MessageSquare, PackageCheck, PackageOpen, Radio, Video, type LucideIcon } from 'lucide-react'
import type { ScheduleAgendaItem } from './schedule-agenda'

export const scheduleItemIcons: Record<ScheduleAgendaItem['kind'], LucideIcon> = {
  request: ClipboardList,
  venue: MapPin,
  'equipment-checkout': PackageOpen,
  'equipment-return': PackageCheck,
  stream: Radio,
  meeting: Video,
  message: MessageSquare,
}
