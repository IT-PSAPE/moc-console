export type RequestStatus = 'not_started' | 'in_progress' | 'completed' | 'archived'
export type RequestCategory = string

export type RequestFormData = {
  title: string
  requestedBy: string
  dueDate: string
  category: RequestCategory
  who: string
  what: string
  whenText: string
  whereText: string
  why: string
  how: string
  flow: string
}

export type SubmitRequestResult = {
  id: string
  trackingCode: string
}
