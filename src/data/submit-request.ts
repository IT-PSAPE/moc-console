import { supabase } from '@/lib/supabase'
import { workspaceId } from '@/lib/workspace'
import type { RequestFormData, SubmitRequestResult } from '@/types/request'
import { notifyRequestCreated } from './notify-event'

export async function submitPublicRequest(data: RequestFormData): Promise<SubmitRequestResult> {
  const { data: result, error } = await supabase.rpc('public_submit_request', {
    p_workspace_id: workspaceId,
    p_title: data.title,
    p_priority: data.priority,
    p_category: data.category,
    p_due_date: new Date(data.dueDate).toISOString(),
    p_requested_by: data.requestedBy,
    p_who: data.who,
    p_what: data.what,
    p_when_text: data.whenText,
    p_where_text: data.whereText,
    p_why: data.why,
    p_how: data.how,
    p_notes: data.notes || null,
    p_flow: data.flow || null,
  })

  if (error) throw new Error(error.message)

  notifyRequestCreated({
    requestId: result.id,
    title: data.title,
    requesterName: data.requestedBy || null,
  })

  return {
    id: result.id,
    trackingCode: result.tracking_code,
  }
}
