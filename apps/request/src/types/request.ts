export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RequestStatus = 'not_started' | 'in_progress' | 'completed' | 'archived'
export type RequestCategory = 'video_production' | 'video_shooting' | 'graphic_design' | 'event' | 'education'

export type RequestFormData = {
  title: string
  requestedBy: string
  priority: RequestPriority
  dueDate: string
  category: RequestCategory
  who: string
  what: string
  whenText: string
  whereText: string
  why: string
  how: string
  notes: string
  flow: string
}

export type SubmitRequestResult = {
  id: string
  trackingCode: string
}
