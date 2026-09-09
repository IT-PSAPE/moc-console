import { useCopyFeedback } from "@/hooks/use-copy-feedback"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { getBroadcastPublicUrl } from "./broadcast-public-url"

type BroadcastDetailField = "link"

export function useBroadcastDetail(broadcast: Broadcast, onEdit: (broadcast: Broadcast) => void) {
  const copied = useCopyFeedback<BroadcastDetailField>()
  const publicUrl = getBroadcastPublicUrl(broadcast.slug)

  async function copyPublicUrl() {
    await copied.actions.copy(publicUrl, "link")
  }

  function edit() {
    onEdit(broadcast)
  }

  return {
    state: { copiedField: copied.state.copiedField, copyMessage: copied.state.copyMessage },
    actions: { copyPublicUrl, edit },
    meta: { publicUrl },
  }
}
