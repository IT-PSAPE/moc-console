import { Accordion } from "@moc/ui/components/display/accordion";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Button } from "@moc/ui/components/controls/button";
import { Checkbox } from "@moc/ui/components/form/checkbox";
import { Modal } from "@moc/ui/components/overlays/modal";
import type { Stream, StreamPreset } from "@moc/types/streams/stream";
import { NotifyDestinationField } from "./notify-destination-field";
import { StreamAdvancedSection } from "./stream-advanced-section";
import { StreamBasicFields } from "./stream-basic-fields";
import { StreamOptionsSection } from "./stream-options-section";
import { StreamThumbnailField } from "./stream-thumbnail-field";
import { useStreamForm, type StreamFormData } from "./use-stream-form";

export type { StreamFormData } from "./use-stream-form";

type StreamModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: StreamFormData) => Promise<void> | void;
  stream?: Stream | null;
  preset?: StreamPreset | null;
};

export function StreamModal({ open, onOpenChange, onSubmit, stream, preset }: StreamModalProps) {
  const { state, actions, meta } = useStreamForm({ open, onOpenChange, onSubmit, stream, preset });
  const submitLabel = state.isSubmitting
    ? meta.isEditing ? "Updating…" : "Creating…"
    : meta.isEditing ? "Update Stream" : "Create Stream";

  return (
    <Modal open={open} onOpenChange={actions.handleModalOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="md:max-w-lg">
            <Modal.Header>
              <Label.md>{meta.isEditing ? "Edit Stream" : "Create Stream"}</Label.md>
            </Modal.Header>

            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                <StreamBasicFields
                  title={state.title}
                  description={state.description}
                  scheduledStartTime={state.scheduledStartTime}
                  privacyStatus={state.privacyStatus}
                  isForKids={state.isForKids}
                  onTitleChange={actions.setTitle}
                  onDescriptionChange={actions.setDescription}
                  onScheduledStartChange={actions.setScheduledStartTime}
                  onPrivacyChange={actions.setPrivacyStatus}
                  onIsForKidsChange={actions.setIsForKids}
                />

                <StreamThumbnailField
                  hasSelection={state.thumbSelection !== null}
                  selectionName={state.thumbName}
                  previewUrl={state.thumbSelection ? state.thumbPreviewUrl : meta.isEditing ? meta.stream?.thumbnailUrl ?? null : null}
                  status={state.thumbStatus}
                  errorMessage={state.thumbError}
                  thumbnailUrlInput={state.thumbnailUrlInput}
                  thumbnailMode={state.thumbnailMode}
                  onModeChange={actions.setThumbnailMode}
                  onFileSelect={actions.handleFileSelect}
                  onUrlInputChange={actions.setThumbnailUrlInput}
                  onUrlConfirm={actions.handleThumbnailUrlConfirm}
                  onClear={actions.clearThumbnail}
                />

                {!meta.isEditing ? (
                  <NotifyDestinationField value={state.notifyDestinations} onChange={actions.setNotifyDestinations} />
                ) : null}

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
                    onCategoryChange={actions.setCategoryId}
                    onTagInputChange={actions.setTagInput}
                    onTagKeyDown={actions.handleTagKeyDown}
                    onTagBlur={actions.handleTagInputBlur}
                    onRemoveTag={actions.handleRemoveTag}
                    onPlaylistChange={actions.setPlaylistId}
                  />
                  <StreamAdvancedSection
                    latencyPreference={state.latencyPreference}
                    enableDvr={state.enableDvr}
                    enableEmbed={state.enableEmbed}
                    enableAutoStart={state.enableAutoStart}
                    enableAutoStop={state.enableAutoStop}
                    onLatencyChange={actions.setLatencyPreference}
                    onDvrChange={actions.setEnableDvr}
                    onEmbedChange={actions.setEnableEmbed}
                    onAutoStartChange={actions.setEnableAutoStart}
                    onAutoStopChange={actions.setEnableAutoStop}
                  />
                </Accordion>
              </div>
            </Modal.Content>

            <Modal.Footer>
              <Button disabled={!meta.canSubmit} onClick={actions.handleSubmit}>{submitLabel}</Button>
              <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
            </Modal.Footer>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
