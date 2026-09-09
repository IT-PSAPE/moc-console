import { fetchBroadcasts } from "@/data/fetch-broadcasts"
import { createBroadcast as createBroadcastRecord, deleteBroadcast as deleteBroadcastRecord, updateBroadcast as updateBroadcastRecord, type CreateBroadcastParams, type DeleteBroadcastParams, type DeleteBroadcastResult, type UpdateBroadcastParams } from "@/data/mutate-broadcasts"
import { useWorkspaceResource } from "@/hooks/use-workspace-resource"
import { useWorkspace } from "@/lib/workspace-context"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"

type BroadcastsContextValue = {
  state: {
    broadcasts: Broadcast[]
    broadcastsError: Error | null
    isLoadingBroadcasts: boolean
  }
  actions: {
    createBroadcast: (params: Omit<CreateBroadcastParams, "workspaceId">) => Promise<Broadcast>
    deleteBroadcast: (params: Omit<DeleteBroadcastParams, "workspaceId">) => Promise<DeleteBroadcastResult>
    loadBroadcasts: () => Promise<void>
    retryBroadcasts: () => Promise<void>
    updateBroadcast: (params: Omit<UpdateBroadcastParams, "workspaceId">) => Promise<Broadcast>
  }
  meta: {
    canCreate: boolean
    canDelete: boolean
    canUpdate: boolean
    workspaceId: string | null
  }
}

const BroadcastsContext = createContext<BroadcastsContextValue | null>(null)
const emptyBroadcasts: Broadcast[] = []

export function BroadcastsProvider({ children }: { children: ReactNode }) {
  const { currentWorkspaceId, role } = useWorkspace()
  const { data: broadcasts, error: broadcastsError, isLoading: isLoadingBroadcasts, load, updateData } = useWorkspaceResource({ emptyValue: emptyBroadcasts, fetcher: fetchBroadcasts, resource: "broadcasts", workspaceId: currentWorkspaceId })

  const loadBroadcasts = useCallback(async () => {
    await load()
  }, [load])

  const retryBroadcasts = useCallback(async () => {
    await load(true)
  }, [load])

  const createBroadcast = useCallback(async (params: Omit<CreateBroadcastParams, "workspaceId">) => {
    if (!currentWorkspaceId) throw new Error("Select a workspace before creating a broadcast")
    const broadcast = await createBroadcastRecord({ ...params, workspaceId: currentWorkspaceId })
    updateData((current) => [broadcast, ...current])
    return broadcast
  }, [currentWorkspaceId, updateData])

  const deleteBroadcast = useCallback(async (params: Omit<DeleteBroadcastParams, "workspaceId">) => {
    if (!currentWorkspaceId) throw new Error("Select a workspace before deleting a broadcast")
    const result = await deleteBroadcastRecord({ ...params, workspaceId: currentWorkspaceId })
    updateData((current) => current.filter((entry) => entry.id !== params.id))
    return result
  }, [currentWorkspaceId, updateData])

  const updateBroadcast = useCallback(async (params: Omit<UpdateBroadcastParams, "workspaceId">) => {
    if (!currentWorkspaceId) throw new Error("Select a workspace before editing a broadcast")
    const broadcast = await updateBroadcastRecord({ ...params, workspaceId: currentWorkspaceId })
    updateData((current) => current.map((entry) => entry.id === broadcast.id ? broadcast : entry))
    return broadcast
  }, [currentWorkspaceId, updateData])

  const value = useMemo<BroadcastsContextValue>(() => ({
    state: { broadcasts, broadcastsError, isLoadingBroadcasts },
    actions: { createBroadcast, deleteBroadcast, loadBroadcasts, retryBroadcasts, updateBroadcast },
    meta: { canCreate: role?.can_create ?? false, canDelete: role?.can_delete ?? false, canUpdate: role?.can_update ?? false, workspaceId: currentWorkspaceId },
  }), [broadcasts, broadcastsError, createBroadcast, currentWorkspaceId, deleteBroadcast, isLoadingBroadcasts, loadBroadcasts, retryBroadcasts, role?.can_create, role?.can_delete, role?.can_update, updateBroadcast])

  return <BroadcastsContext.Provider value={value}>{children}</BroadcastsContext.Provider>
}

export function useBroadcasts() {
  const context = useContext(BroadcastsContext)

  if (!context) {
    throw new Error("useBroadcasts must be used within a BroadcastsProvider")
  }

  return context
}
