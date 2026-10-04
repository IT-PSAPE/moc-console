import { cleanupExpiredUploads, cleanupOrphanMultipartUploads, cleanupOrphanStagingObjects, processUploadJobs } from "../../packages/backend/src/storage/finalize-worker.js"
import { jsonResponse, readScheduledTrigger } from "./trigger-envelope.js"

const EXPECTED_TRIGGER = "storage-uploads"

export async function handleUploadWorkerRequest(request: Request): Promise<Response> {
  const envelope = await readScheduledTrigger(request, EXPECTED_TRIGGER)
  if (!envelope) return jsonResponse(403, { error: "trigger_required" })

  try {
    const finalized = await processUploadJobs(4)
    const cleaned = await cleanupExpiredUploads(100)
    const orphaned = await cleanupOrphanStagingObjects()
    const orphanMultiparts = await cleanupOrphanMultipartUploads()
    return jsonResponse(200, { invocationId: envelope.invocation_id, finalized, cleaned, orphaned, orphanMultiparts })
  } catch {
    return jsonResponse(500, { error: "upload_worker_failed" })
  }
}

export default handleUploadWorkerRequest
