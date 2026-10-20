import { Button } from "@moc/ui/components/controls/button"
import { Modal } from "@moc/ui/components/overlays/modal"
import type { BroadcastUploadSubmit } from "./broadcast-editor-types"
import { BroadcastPlaylistField } from "./broadcast-playlist-field"
import { useBroadcastUpload } from "./use-broadcast-upload"
import type { Broadcast } from "@moc/types/broadcast/broadcast"

type BroadcastUploadFormProps = { broadcast: Broadcast; disabled?: boolean; onOpenChange: (open: boolean) => void; onSubmit: (params: BroadcastUploadSubmit) => Promise<void>; open: boolean }

export function BroadcastUploadForm({ broadcast, disabled, onOpenChange, onSubmit, open }: BroadcastUploadFormProps) {
  const { state, actions } = useBroadcastUpload({ broadcast, disabled, onOpenChange, onSubmit, open })

  function handleFilesAdd(batch: Parameters<typeof actions.addFiles>[0]) { void actions.addFiles(batch) }
  function handleSubmit() { void actions.submit() }

  return (
    <>
      <Modal.Content>
        <BroadcastPlaylistField
          error={state.error}
          isChecking={state.isChecking}
          isLocked={state.isLocked}
          items={state.items}
          kind={broadcast.kind}
          onFilesAdd={handleFilesAdd}
          onItemReorder={actions.reorderItems}
          onItemRemove={actions.removeItem}
          onRejectionsDismiss={actions.dismissRejections}
          rejections={state.rejections}
          uploadProgress={state.uploadProgress}
        />
      </Modal.Content>
      <Modal.Footer>
        <Button variant="secondary" disabled={state.isLocked} onClick={actions.cancel}>Cancel</Button>
        <Button disabled={state.isLocked || state.isChecking} onClick={handleSubmit}>{state.isSubmitting ? "Uploading…" : "Save"}</Button>
      </Modal.Footer>
    </>
  )
}
