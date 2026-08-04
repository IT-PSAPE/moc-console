import { Accordion } from "@moc/ui/components/display/accordion"
import { Paragraph } from "@moc/ui/components/display/text"
import { Button } from "@moc/ui/components/controls/button"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { Modal } from "@moc/ui/components/overlays/modal"
import { UnsavedChangesDialog } from "@moc/ui/components/overlays/unsaved-changes-dialog"
import type { Stream, StreamPreset } from "@moc/types/streams/stream"
import { NotifyDestinationField } from "./notify-destination-field"
import { StreamAdvancedSection } from "./stream-advanced-section"
import { StreamBasicFields } from "./stream-basic-fields"
import { StreamOptionsSection } from "./stream-options-section"
import { StreamThumbnailField } from "./stream-thumbnail-field"
import { useStreamForm, type StreamFormData } from "./use-stream-form"

type StreamFormProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (params: StreamFormData) => Promise<void> | void
  stream?: Stream | null
  preset?: StreamPreset | null
}

export function StreamForm({ open, onOpenChange, onSubmit, stream, preset }: StreamFormProps) {
  const { state, actions, meta } = useStreamForm({ open, onOpenChange, onSubmit, stream, preset })
  const submitLabel = state.isSubmitting
    ? meta.isEditing ? "Updating…" : "Creating…"
    : meta.isEditing ? "Update stream" : "Create stream"

  return (
    <>
      <Modal.Content>
        <div className="flex flex-col gap-4 p-4">
          <StreamBasicFields
            title={state.title}
            description={state.description}
            scheduledStartTime={state.scheduledStartTime}
            privacyStatus={state.privacyStatus}
            isForKids={state.isForKids}
            onTitleChange={actions.updateTitle}
            onDescriptionChange={actions.updateDescription}
            onScheduledStartChange={actions.updateScheduledStartTime}
            onPrivacyChange={actions.updatePrivacyStatus}
            onIsForKidsChange={actions.updateIsForKids}
          />

          <StreamThumbnailField
            hasSelection={state.thumbSelection !== null}
            selectionName={state.thumbName}
            previewUrl={state.thumbSelection ? state.thumbPreviewUrl : meta.isEditing ? meta.stream?.thumbnailUrl ?? null : null}
            status={state.thumbStatus}
            errorMessage={state.thumbError}
            thumbnailUrlInput={state.thumbnailUrlInput}
            thumbnailMode={state.thumbnailMode}
            onModeChange={actions.updateThumbnailMode}
            onFileSelect={actions.handleFileSelect}
            onUrlInputChange={actions.updateThumbnailUrlInput}
            onUrlConfirm={actions.handleThumbnailUrlConfirm}
            onClear={actions.clearThumbnail}
          />

          {!meta.isEditing ? <NotifyDestinationField value={state.notifyDestinations} onChange={actions.updateNotifyDestinations} /> : null}

          {!meta.isEditing ? (
            <Checkbox checked={state.savePreset} onChange={actions.handleSavePresetChange}>
              <div className="flex flex-col">
                <Paragraph.sm>Remember these settings</Paragraph.sm>
                <Paragraph.xs className="text-quaternary">Use these values as defaults for the next stream.</Paragraph.xs>
              </div>
            </Checkbox>
          ) : null}

          <Accordion type="multiple">
            <StreamOptionsSection
              categoryId={state.categoryId}
              categories={state.categories}
              tags={state.tags}
              tagInput={state.tagInput}
              playlistId={state.playlistId}
              playlists={state.playlists}
              onCategoryChange={actions.updateCategoryId}
              onTagInputChange={actions.updateTagInput}
              onTagKeyDown={actions.handleTagKeyDown}
              onTagBlur={actions.handleTagInputBlur}
              onRemoveTag={actions.handleRemoveTag}
              onPlaylistChange={actions.updatePlaylistId}
            />
            <StreamAdvancedSection
              latencyPreference={state.latencyPreference}
              enableDvr={state.enableDvr}
              enableEmbed={state.enableEmbed}
              enableAutoStart={state.enableAutoStart}
              enableAutoStop={state.enableAutoStop}
              onLatencyChange={actions.updateLatencyPreference}
              onDvrChange={actions.updateEnableDvr}
              onEmbedChange={actions.updateEnableEmbed}
              onAutoStartChange={actions.updateEnableAutoStart}
              onAutoStopChange={actions.updateEnableAutoStop}
            />
          </Accordion>
        </div>
      </Modal.Content>

      <Modal.Footer>
        <Button disabled={!meta.canSubmit} onClick={actions.handleSubmit}>{submitLabel}</Button>
        <Button variant="secondary" onClick={actions.requestClose}>Cancel</Button>
      </Modal.Footer>
      <UnsavedChangesDialog open={state.discardChangesOpen} onSave={actions.handleSubmit} onDiscard={actions.discardChanges} onCancel={actions.cancelDiscardChanges} isSaving={state.isSubmitting} />
    </>
  )
}
