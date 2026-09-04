import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Radio, RadioGroup } from "@moc/ui/components/form/radio"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Modal } from "@moc/ui/components/overlays/modal"
import { UnsavedChangesDialog } from "@moc/ui/components/overlays/unsaved-changes-dialog"
import { useId } from "react"
import type { BroadcastFormSubmit } from "./broadcast-editor-types"
import { BroadcastPlaylistField } from "./broadcast-playlist-field"
import { useBroadcastForm } from "./use-broadcast-form"

type BroadcastFormProps = {
  broadcast?: Broadcast | null
  onOpenChange: (open: boolean) => void
  onSubmit: (params: BroadcastFormSubmit) => Promise<void>
  open: boolean
}

export function BroadcastForm({ broadcast, onOpenChange, onSubmit, open }: BroadcastFormProps) {
  const { state, actions, meta } = useBroadcastForm({ broadcast, onOpenChange, onSubmit, open })
  const fieldId = useId()
  const titleId = `${fieldId}-title`
  const titleErrorId = `${fieldId}-title-error`
  const descriptionId = `${fieldId}-description`

  function handleSubmit() {
    void actions.submit()
  }

  return (
    <>
      <Modal.Content>
        <div className="flex flex-col gap-4 p-4">
          <FormField label="Title" htmlFor={titleId} required>
            <Input
              id={titleId}
              aria-label="Broadcast title"
              aria-describedby={state.errors.title ? titleErrorId : undefined}
              aria-invalid={Boolean(state.errors.title) || undefined}
              name="broadcast-title"
              autoComplete="off"
              placeholder="Sunday service"
              value={state.title}
              onChange={actions.changeTitle}
              disabled={state.isSubmitting}
            />
            {state.errors.title ? <Paragraph.xs id={titleErrorId} role="alert" aria-live="polite" className="text-error">{state.errors.title}</Paragraph.xs> : null}
          </FormField>

          <FormField label="Description" htmlFor={descriptionId} optional>
            <TextArea
              id={descriptionId}
              aria-label="Broadcast description"
              name="broadcast-description"
              placeholder="What listeners are tuning into"
              value={state.description}
              onChange={actions.changeDescription}
              disabled={state.isSubmitting}
            />
          </FormField>

          {meta.isEditing ? null : (
            <FormField label="Media type" required>
              <RadioGroup name="broadcast-kind" value={state.kind} onValueChange={actions.changeKind} disabled={state.isSubmitting} className="flex gap-6">
                <Radio value="audio">{BROADCAST_KIND_LABELS.audio}</Radio>
                <Radio value="video">{BROADCAST_KIND_LABELS.video}</Radio>
              </RadioGroup>
            </FormField>
          )}

          <BroadcastPlaylistField
            error={state.errors.playlist}
            isLocked={state.isSubmitting}
            items={state.items}
            kind={state.kind}
            onFilesAdd={actions.addFiles}
            onItemMove={actions.moveItem}
            onItemRemove={actions.removeItem}
            uploadProgress={state.uploadProgress}
          />
        </div>
      </Modal.Content>

      <Modal.Footer>
        <Button disabled={state.isSubmitting} onClick={handleSubmit}>{meta.submitLabel}</Button>
        <Button variant="secondary" disabled={state.isSubmitting} onClick={actions.requestClose}>Cancel</Button>
      </Modal.Footer>
      <UnsavedChangesDialog open={state.discardChangesOpen} onSave={handleSubmit} onDiscard={actions.discardChanges} onCancel={actions.cancelDiscardChanges} isSaving={state.isSubmitting} />
    </>
  )
}
