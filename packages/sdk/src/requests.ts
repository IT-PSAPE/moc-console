import type {
  Request,
  RequestCategoryDefinition,
  Status,
} from "@moc/types/requests"
import type { MocTransport } from "./transport"

export type RequestCategoryDraft = { name: string; description: string | null }
export type CreateRequestCategoryInput = RequestCategoryDraft & { key: string }
export type RequestCategoryRename = { name: string }

type RequestsClient = {
  list(workspaceId?: string): Promise<Request[]>
  listByStatus(status: Status, workspaceId: string): Promise<Request[]>
  getById(id: string, workspaceId?: string): Promise<Request | undefined>
  listArchived(workspaceId?: string): Promise<Request[]>
  listAssignedIds(workspaceId: string): Promise<string[]>
  save(request: Request, workspaceId: string): Promise<Request>
  setStatus(id: string, status: Status, workspaceId: string): Promise<void>
  delete(id: string, workspaceId: string): Promise<void>
  addAssignee(requestId: string, userId: string, duty: string, workspaceId: string): Promise<boolean>
  removeAssignee(requestId: string, userId: string, workspaceId: string): Promise<void>
  listCategories(workspaceId?: string): Promise<RequestCategoryDefinition[]>
  createCategory(input: CreateRequestCategoryInput, workspaceId: string): Promise<RequestCategoryDefinition>
  updateCategory(id: string, rename: RequestCategoryRename, workspaceId: string): Promise<RequestCategoryDefinition>
  setCategoryActive(id: string, active: boolean, workspaceId: string): Promise<void>
  deleteCategory(id: string, workspaceId: string): Promise<void>
}

export function createRequestsClient(transport: MocTransport): RequestsClient {
  async function call<T>(operation: string, input?: unknown, workspaceId?: string): Promise<T> {
    return transport.call<T>("requests", operation, input, workspaceId)
  }

  async function callVoid(operation: string, input?: unknown, workspaceId?: string): Promise<void> {
    await call<null>(operation, input, workspaceId)
  }

  return {
    list: (workspaceId) => call<Request[]>("list", { workspaceId }, workspaceId),
    listByStatus: (status, workspaceId) => call<Request[]>("listByStatus", { status }, workspaceId),
    getById: (id, workspaceId) => call<Request | undefined>("getById", { id, workspaceId }, workspaceId),
    listArchived: (workspaceId) => call<Request[]>("listArchived", { workspaceId }, workspaceId),
    listAssignedIds: (workspaceId) => call<string[]>("listAssignedIds", {}, workspaceId),
    save: (request, workspaceId) => call<Request>("save", { request }, workspaceId),
    setStatus: (id, status, workspaceId) => callVoid("setStatus", { id, status }, workspaceId),
    delete: (id, workspaceId) => callVoid("delete", { id }, workspaceId),
    addAssignee: (requestId, userId, duty, workspaceId) => call<boolean>("addAssignee", { requestId, userId, duty }, workspaceId),
    removeAssignee: (requestId, userId, workspaceId) => callVoid("removeAssignee", { requestId, userId }, workspaceId),
    listCategories: (workspaceId) => call<RequestCategoryDefinition[]>("listCategories", { workspaceId }, workspaceId),
    createCategory: (input, workspaceId) => call<RequestCategoryDefinition>("createCategory", { ...input, workspaceId }, workspaceId),
    updateCategory: (id, rename, workspaceId) => call<RequestCategoryDefinition>("updateCategory", { id, ...rename }, workspaceId),
    setCategoryActive: (id, active, workspaceId) => callVoid("setCategoryActive", { id, active }, workspaceId),
    deleteCategory: (id, workspaceId) => callVoid("deleteCategory", { id }, workspaceId),
  }
}
