import { queryRows } from '../database.js'
import type { QueryResultRow } from 'pg'

export type WeeklyArchiveResult = { archivedRequests: number; archivedBookings: number }

/** Run the source database's idempotent, workspace-delay-aware archive functions. */
export async function runWeeklyArchive(): Promise<WeeklyArchiveResult> {
  const [requests] = await queryRows<QueryResultRow & { count: string }>(
    'SELECT count(*)::text AS count FROM public.archive_completed_requests()',
  )
  const [bookings] = await queryRows<QueryResultRow & { count: string }>(
    'SELECT count(*)::text AS count FROM public.archive_returned_bookings()',
  )
  return {
    archivedRequests: Number(requests?.count ?? 0),
    archivedBookings: Number(bookings?.count ?? 0),
  }
}
