import type { ChangeEvent } from "react"
import { AvatarCropperModal } from "@/features/account/avatar-cropper-modal"
import { RemoveAvatarModal } from "@/features/account/remove-avatar-modal"
import { Button } from "@moc/ui/components/controls/button"
import { Avatar } from "@moc/ui/components/display/avatar"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { FormField } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Modal } from "@moc/ui/components/overlays/modal"
import { UnsavedChangesDialog } from "@moc/ui/components/overlays/unsaved-changes-dialog"
import { Camera, Trash2 } from "lucide-react"
import { PROFILE_STATUS_MAX_LENGTH, useProfileSettings } from "./use-profile-settings"

type EditProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { state, actions, fileInputRef, meta } = useProfileSettings({ open, onOpenChange })
  const { profile } = meta

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setName(event.target.value)
  }

  function handleSurnameChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSurname(event.target.value)
  }

  function handleDutyChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setDuty(event.target.value)
  }

  function handleStatusChange(event: ChangeEvent<HTMLTextAreaElement>) {
    actions.setStatus(event.target.value)
  }

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} closeOnBackdropClick={false} closeOnEscape={false}>
        <Modal.Portal>
          <Modal.Backdrop />
          <Modal.Positioner>
            <Modal.FullScreenPanel className="w-full md:!max-w-lg">
              <Modal.Header><Label.md>Edit profile</Label.md></Modal.Header>
              <Modal.Content>
                {profile ? (
                  <div className="flex flex-col gap-5 p-4">
                    <div className="flex flex-col items-center gap-2 py-2">
                      <div className="relative">
                        {profile.avatarUrl
                          ? <Avatar src={profile.avatarUrl} name={meta.initials} size="2xl" />
                          : <Avatar.initials name={meta.initials} size="2xl" />}
                        <Button.Icon
                          aria-label="Change profile photo"
                          variant="secondary"
                          icon={<Camera />}
                          className="absolute -bottom-1 -right-1 rounded-full shadow-sm"
                          disabled={state.isUploadingAvatar}
                          onClick={actions.pickAvatar}
                        />
                      </div>
                      {profile.avatarUrl ? (
                        <Button variant="ghost" icon={<Trash2 />} className="text-error" disabled={state.isUploadingAvatar} onClick={actions.openRemoveAvatar}>
                          Remove photo
                        </Button>
                      ) : <Paragraph.xs className="text-tertiary">Add a photo so teammates can recognise you.</Paragraph.xs>}
                      <Input aria-label="Profile photo" ref={fileInputRef} name="avatar" type="file" accept="image/*" onChange={actions.selectAvatar} style="ghost" className="hidden" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="First name" htmlFor="given-name" required>
                        <Input id="given-name" aria-label="First name" autoComplete="given-name" name="given-name" value={state.name} onChange={handleNameChange} placeholder="First name" />
                      </FormField>
                      <FormField label="Last name" htmlFor="family-name" required>
                        <Input id="family-name" aria-label="Last name" autoComplete="family-name" name="family-name" value={state.surname} onChange={handleSurnameChange} placeholder="Last name" />
                      </FormField>
                    </div>

                    <FormField label="Email" htmlFor="email">
                      <Input id="email" aria-label="Email" autoComplete="email" name="email" type="email" spellCheck={false} value={profile.email} disabled readOnly />
                    </FormField>

                    <FormField label="Duty" htmlFor="duty" optional>
                      <Input id="duty" aria-label="Duty" autoComplete="off" name="duty" value={state.duty} onChange={handleDutyChange} placeholder="e.g. Camera operator" />
                    </FormField>

                    <FormField label="Status" htmlFor="status" optional>
                      <TextArea id="status" aria-label="Status" autoComplete="off" name="status" value={state.status} onChange={handleStatusChange} placeholder="What's on your mind?" rows={2} maxLength={PROFILE_STATUS_MAX_LENGTH} />
                      <Paragraph.xs className={meta.statusLength > PROFILE_STATUS_MAX_LENGTH ? "text-error" : "text-quaternary"}>{meta.statusLength}/{PROFILE_STATUS_MAX_LENGTH}</Paragraph.xs>
                    </FormField>
                  </div>
                ) : <Paragraph.sm className="p-4 text-tertiary">Sign in to edit your profile.</Paragraph.sm>}
              </Modal.Content>
              <Modal.Footer>
                <Button variant="secondary" onClick={actions.requestClose}>Cancel</Button>
                <Button onClick={actions.save} disabled={!meta.canSave}>{state.isSaving ? "Saving…" : "Save"}</Button>
              </Modal.Footer>
            </Modal.FullScreenPanel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal>

      <UnsavedChangesDialog open={state.discardChangesOpen} onSave={actions.save} onDiscard={actions.close} onCancel={actions.cancelDiscardChanges} isSaving={state.isSaving} />

      <AvatarCropperModal open={state.pendingAvatarFile !== null} file={state.pendingAvatarFile} onCancel={actions.cancelAvatarCrop} onConfirm={actions.uploadAvatar} />
      <RemoveAvatarModal open={state.removeAvatarOpen} onCancel={actions.closeRemoveAvatar} onConfirm={actions.removeAvatar} isRemoving={state.isUploadingAvatar} />
    </>
  )
}
