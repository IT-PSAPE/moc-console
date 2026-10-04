import type { Checklist } from "@moc/types/checklists"
import type { MocTransport } from "./transport"

export type CreateChecklistInstanceOverrides = { name?: string; description?: string; scheduledAt?: string }
export type RequestRelatedChecklist = { id: string; name: string; completedItems: number; totalItems: number }

type ChecklistsClient = {
  list(workspaceId?: string): Promise<Checklist[]>
  getById(id: string, workspaceId?: string): Promise<Checklist | undefined>
  getRelatedToRequest(workspaceId: string, requestId: string): Promise<RequestRelatedChecklist[]>
  save(checklist: Checklist, workspaceId: string): Promise<Checklist>
  delete(id: string, workspaceId: string): Promise<void>
  createFromTemplate(templateId: string, overrides: CreateChecklistInstanceOverrides, workspaceId: string): Promise<string>
  addAssignee(itemId: string, userId: string, workspaceId: string): Promise<boolean>
  removeAssignee(itemId: string, userId: string, workspaceId: string): Promise<void>
}

export function createChecklistsClient(transport: MocTransport): ChecklistsClient {
  async function call<T>(operation: string, input?: unknown, workspaceId?: string): Promise<T> {
    return transport.call<T>("checklists", operation, input, workspaceId)
  }

  async function callVoid(operation: string, input?: unknown, workspaceId?: string): Promise<void> {
    await call<null>(operation, input, workspaceId)
  }

  return {
    list: (workspaceId) => call<Checklist[]>("list", { workspaceId }, workspaceId),
    getById: (id, workspaceId) => call<Checklist | undefined>("getById", { id, workspaceId }, workspaceId),
    getRelatedToRequest: (workspaceId, requestId) => call<RequestRelatedChecklist[]>("getRelatedToRequest", { workspaceId, requestId }, workspaceId),
    save: (checklist, workspaceId) => call<Checklist>("save", { checklist }, workspaceId),
    delete: (id, workspaceId) => callVoid("delete", { id }, workspaceId),
    createFromTemplate: (templateId, overrides, workspaceId) => call<string>("createFromTemplate", { templateId, overrides }, workspaceId),
    addAssignee: (itemId, userId, workspaceId) => call<boolean>("addAssignee", { itemId, userId }, workspaceId),
    removeAssignee: (itemId, userId, workspaceId) => callVoid("removeAssignee", { itemId, userId }, workspaceId),
  }
}
