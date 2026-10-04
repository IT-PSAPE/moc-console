import { moc } from '@/lib/moc-client'
import { parseBrowserDateTimeInputToUtcIso } from '@moc/utils/browser-date-time'
import { workspaceId } from '@/lib/workspace'
import type { RequestFormData, SubmitRequestResult } from '@/types/request'

export async function submitPublicRequest(data: RequestFormData): Promise<SubmitRequestResult> {
  const result = await moc.publicSubmissions.submitRequest(workspaceId, {
    ...data,
    dueDate: parseBrowserDateTimeInputToUtcIso(data.dueDate),
    notes: data.notes || null,
    flow: data.flow || null,
  })
  moc.publicSubmissions.notifyCreated('request', result.id, result.trackingCode)
  return result
}
