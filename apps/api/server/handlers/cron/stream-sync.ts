import { requireAuthorizedCronGet } from "../../cron-auth.js"
import { runStreamSync, type StreamSyncSummary } from "../../streams/run-stream-sync.js"

// Daily provider sweep — wired to a Vercel Cron (09:00 UTC, see vercel.json).
// Reconciles YouTube live broadcasts and Zoom meetings for every workspace that
// has that provider connected, so the console reflects what the providers
// actually hold without anyone pressing Sync. Runs as the service role with no
// signed-in user; adopted rows are credited to whoever authorised the
// integration.
//
// 09:00 UTC is just after YouTube's midnight-Pacific quota reset, so the sweep
// never competes with a day of console-driven quota spend, and it is clear of
// the 00:00 and 01:00 jobs that already contend for Supabase.

type ApiRequest = {
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

export default async function handler(
  request: ApiRequest,
  response: ApiResponse,
  run: () => Promise<StreamSyncSummary> = runStreamSync,
) {
  response.setHeader("Content-Type", "application/json")

  if (!requireAuthorizedCronGet(request, response)) return

  try {
    // 200 even when some workspaces failed: a non-2xx makes Vercel retry the
    // whole sweep, re-spending provider quota on the workspaces that succeeded.
    response.status(200).json({ ok: true, ...await run() })
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Failed to sync provider streams" })
  }
}
