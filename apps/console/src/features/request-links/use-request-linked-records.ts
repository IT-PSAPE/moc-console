import { invalidateWorkspaceResource } from "@/data/workspace-resource-cache"
import { fetchRequestLinkedRecords, setRecordRequest, type RequestLinkedRecord } from "@/data/request-links"
import { useWorkspaceResource } from "@/hooks/use-workspace-resource"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useCallback, useRef, useState } from "react"

const emptyRecords: RequestLinkedRecord[] = []

export function useRequestLinkedRecords(requestId: string, enabled = true) {
  const { currentWorkspaceId, role } = useWorkspace()
  const { toast } = useFeedback()
  const [isSaving, setIsSaving] = useState(false)
  const busy = useRef(false)
  const resource = useWorkspaceResource({ emptyValue: emptyRecords, resource: "request-linked-records", fetcher: fetchRequestLinkedRecords, workspaceId: currentWorkspaceId, enabled })
  const { data, load, setData } = resource

  const change = useCallback(async (record: RequestLinkedRecord, linkedRequestId: string | null) => {
    if (!currentWorkspaceId || !role?.can_update || busy.current) return
    busy.current = true
    setIsSaving(true)
    try {
      await setRecordRequest(record.kind, record.id, linkedRequestId, currentWorkspaceId)
      setData(data.map((item) => item.key === record.key ? { ...item, requestId: linkedRequestId } : item))
    } catch (error) {
      toast({ title: "Could not update request link", description: getErrorMessage(error, "Try again."), variant: "error" })
    } finally { busy.current = false; setIsSaving(false) }
  }, [currentWorkspaceId, role?.can_update, toast, data, setData])

  const link = useCallback((key: string | null) => {
    const record = data.find((item) => item.key === key && item.requestId === null)
    if (record) void change(record, requestId)
  }, [change, data, requestId])
  const unlink = useCallback((record: RequestLinkedRecord) => { void change(record, null) }, [change])
  const retry = useCallback(() => {
    if (currentWorkspaceId) invalidateWorkspaceResource(currentWorkspaceId, "request-linked-records")
    void load(true)
  }, [currentWorkspaceId, load])

  return {
    state: { records: data.filter((record) => record.requestId === requestId), options: data.filter((record) => record.requestId === null).map((record) => ({ value: record.key, label: `${record.label} · ${record.detail}` })), isLoading: resource.isLoading, error: resource.error, isSaving },
    actions: { link, unlink, retry }, meta: { canUpdate: role?.can_update === true },
  }
}
