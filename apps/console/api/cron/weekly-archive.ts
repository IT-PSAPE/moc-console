import { getSupabaseAdmin } from "../../server/supabase-admin.js"
import { isAuthorizedCron } from "../../server/cron-auth.js"

// Weekly archive sweep. Flips finished work to 'archived' after each
// workspace's configured delay so it drops out of active views without
// being deleted:
//   • requests: completed -> archived
//   • bookings: returned  -> archived
// Set-based and idempotent (filtered by source status), so a re-run is a
// no-op. Runs as the service role (bypasses RLS) across all workspaces.
// Silent by design: no per-item Telegram notification for bulk archiving.

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type ArchivedRow = {
  id: string
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Content-Type", "application/json")

  if (!isAuthorizedCron(request)) {
    response.status(401).json({ error: "Unauthorized" })
    return
  }

  const admin = getSupabaseAdmin()

  const { data: requests, error: requestsError } = await admin.rpc("archive_completed_requests")

  if (requestsError) {
    response.status(500).json({ error: `Failed to archive requests: ${requestsError.message}` })
    return
  }

  const { data: bookings, error: bookingsError } = await admin.rpc("archive_returned_bookings")

  if (bookingsError) {
    response.status(500).json({ error: `Failed to archive bookings: ${bookingsError.message}` })
    return
  }

  response.status(200).json({
    ok: true,
    archivedRequests: ((requests ?? []) as ArchivedRow[]).length,
    archivedBookings: ((bookings ?? []) as ArchivedRow[]).length,
  })
}
