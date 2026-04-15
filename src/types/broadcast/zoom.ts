export type ZoomMeetingType = "instant" | "scheduled" | "recurring_no_fixed" | "recurring_fixed"
export type ZoomRecurrenceType = "none" | "daily" | "weekly" | "monthly"

export type ZoomConnection = {
  id: string
  workspaceId: string
  zoomUserId: string
  email: string
  displayName: string
  connectedBy: string
  createdAt: string
}

export type ZoomMeeting = {
  id: string
  workspaceId: string
  zoomMeetingId: number
  topic: string
  description: string
  meetingType: ZoomMeetingType
  startTime: string | null
  duration: number
  timezone: string
  joinUrl: string | null
  startUrl: string | null
  password: string | null
  recurrenceType: ZoomRecurrenceType
  recurrenceInterval: number | null
  recurrenceDays: string | null
  waitingRoom: boolean
  muteOnEntry: boolean
  continuousChat: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}
