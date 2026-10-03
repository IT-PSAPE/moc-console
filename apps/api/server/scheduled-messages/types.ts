import type { ScheduledOccurrence, ScheduledSchedule, ScheduledEditScope } from '@moc/notifications'

export type Occurrence = ScheduledOccurrence
export type Schedule = ScheduledSchedule
export type AttendanceResponse = { user_id: string; name: string; status: 'awaiting' | 'attending' | 'not_attending'; arrival_time: string | null }
export type EditScope = ScheduledEditScope
export type SessionData = {
  revision?: number; field?: string; value?: string; scope?: EditScope; promptId?: number;
  status?: 'attending' | 'not_attending'; stage?: 'input' | 'confirm'; choices?: string[];
}
export type MessageSession = {
  id: string; user_id: string; telegram_user_id: string; workspace_id: string; chat_id: string;
  thread_id: number | null; ephemeral_message_id: number | null; occurrence_id: string | null;
  kind: 'admin' | 'attendance'; data: SessionData; expires_at: string;
}
