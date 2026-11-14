import { ListChecks as TaskList, MapPin, Chat as Message, CubeTransparent as BoxIso, Package, Broadcast as AntennaSignal, VideoCamera } from '@phosphor-icons/react'
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
