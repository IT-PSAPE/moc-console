import type { ScheduledSnapshot } from '@moc/notifications'
import { apiUrl } from '@moc/utils/api-url'
import { buildSessionHeaders } from '@/lib/api-auth'

export async function fetchScheduledMessages(workspaceId: string): Promise<ScheduledSnapshot> {
  return request(workspaceId)
}
export async function mutateScheduledMessage(workspaceId: string,op: string,data: unknown): Promise<ScheduledSnapshot> {
  return request(workspaceId,{op,data,workspaceId})
}
async function request(workspaceId: string,body?: unknown): Promise<ScheduledSnapshot> {
  const headers=await buildSessionHeaders()
  const response=await fetch(apiUrl(`/api/telegram/scheduled-messages${body?'':`?workspaceId=${encodeURIComponent(workspaceId)}`}`),{
    method:body?'POST':'GET',headers:{...headers,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,
  })
  const result=await response.json() as ScheduledSnapshot & {error?:string}
  if(!response.ok) throw new Error(result.error??'Scheduled message operation failed')
  return result
}
