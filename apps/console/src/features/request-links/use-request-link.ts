import { fetchRecordRequest, fetchRequestLinkOptions, setRecordRequest, type RequestLinkedKind, type RequestLinkOption } from "@/data/request-links"
import { useWorkspaceResource } from "@/hooks/use-workspace-resource"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useCallback, useEffect, useRef, useState } from "react"

type LinkData = { requestId: string | null; options: RequestLinkOption[] }
const emptyData: LinkData = { requestId: null, options: [] }

export function useRequestLink(kind: RequestLinkedKind, id: string) {
  const { currentWorkspaceId, role } = useWorkspace()
  const { toast } = useFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const busy = useRef(false)
  const fetcher = useCallback(async (workspaceId: string): Promise<LinkData> => {
    const [requestId, options] = await Promise.all([fetchRecordRequest(kind, id, workspaceId), fetchRequestLinkOptions(workspaceId)])
    return { requestId, options }
  }, [id, kind])
  const resource = useWorkspaceResource({ emptyValue: emptyData, resource: `${kind}:${id}:request-link`, fetcher, workspaceId: currentWorkspaceId })
  const { data, load, setData } = resource
  useEffect(() => { void load(true) }, [load])

  const change = useCallback(async (requestId: string | null) => {
    if (!currentWorkspaceId || !role?.can_update || busy.current || requestId === data.requestId) return
    busy.current = true
    setIsSaving(true)
    try {
      await setRecordRequest(kind, id, requestId, currentWorkspaceId)
      setData({ ...data, requestId })
    } catch (error) {
      toast({ title: "Could not update request link", description: getErrorMessage(error, "Try again."), variant: "error" })
    } finally { busy.current = false; setIsSaving(false) }
  }, [currentWorkspaceId, data, id, kind, role?.can_update, setData, toast])
  const unlink = useCallback(() => { void change(null) }, [change])
  const select = useCallback((value: string | null) => { if (value) void change(value) }, [change])
  const retry = useCallback(() => { void load(true) }, [load])

  return {
    state: { requestId: data.requestId, label: data.options.find((option) => option.id === data.requestId)?.label ?? "Linked request", options: data.options.map((option) => ({ value: option.id, label: option.label })), isLoading: resource.isLoading, error: resource.error, isSaving },
    actions: { select, unlink, retry }, meta: { canUpdate: role?.can_update === true },
  }
}
