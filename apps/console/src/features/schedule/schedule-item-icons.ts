import { TaskList, MapPin, Message, BoxIso, Package, AntennaSignal, VideoCamera } from 'iconoir-react'
import type { ScheduleAgendaItem } from './schedule-agenda'

export const scheduleItemIcons: Record<ScheduleAgendaItem['kind'], typeof TaskList> = {
  request: TaskList,
  venue: MapPin,
  'equipment-checkout': Package,
  'equipment-return': BoxIso,
  stream: AntennaSignal,
  meeting: VideoCamera,
  message: Message,
}
