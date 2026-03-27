import type { CultureRequest, RequestType } from '@/types'

export interface RequestFormState {
  title: string
  requester_email: string
  type: RequestType
  priority: CultureRequest['priority']
  due_date: string
  who: string
  what: string
  when: string
  where: string
  why: string
  how: string
  info: string
  venueIds: string[]
  equipmentIds: string[]
  mediaIds: string[]
}

export const INITIAL_REQUEST_FORM: RequestFormState = {
  title: '',
  requester_email: '',
  type: 'event',
  priority: 'medium',
  due_date: '',
  who: '',
  what: '',
  when: '',
  where: '',
  why: '',
  how: '',
  info: '',
  venueIds: [],
  equipmentIds: [],
  mediaIds: [],
}
