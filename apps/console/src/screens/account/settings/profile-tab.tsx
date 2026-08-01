import type { ChangeEvent } from "react"
import { AvatarCropperModal } from "@/features/account/avatar-cropper-modal"
import { RemoveAvatarModal } from "@/features/account/remove-avatar-modal"
import { TelegramLinkRow } from "@/screens/account/telegram-link-row"
import { Button } from "@moc/ui/components/controls/button"
import { Avatar } from "@moc/ui/components/display/avatar"
import { Divider } from "@moc/ui/components/display/divider"
import { Section } from "@moc/ui/components/display/section"
import { SettingsRow } from "@moc/ui/components/display/settings-row"
import { Paragraph } from "@moc/ui/components/display/text"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { ChevronDown, ImageUp, Trash2 } from "lucide-react"
import { PROFILE_STATUS_MAX_LENGTH, useProfileSettings } from "./use-profile-settings"

export function ProfileTab() {
  const { state, actions, fileInputRef, meta } = useProfileSettings()
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

  if (!profile) {
    return <Paragraph.sm className="text-tertiary">Sign in to view your profile.</Paragraph.sm>
  }

  return (
    <div className="flex flex-col">
      <Section>
        <Section.Header title="Your profile" />
        <Divider className="my-6" />

        <Section.Body>
          <SettingsRow label="Photo">
            <div className="flex items-center gap-4">
              {profile.avatarUrl
                ? <Avatar src={profile.avatarUrl} name={meta.initials} size="xl" />
                : <Avatar.initials name={meta.initials} size="xl" />}
              <div className="flex gap-2">
                {profile.avatarUrl ? (
                  <Dropdown placement="bottom-start">
                    <Dropdown.Trigger>
                      <Button variant="secondary" icon={<ChevronDown />} iconPosition="trailing" disabled={state.isUploadingAvatar}>
                        Change
                      </Button>
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                      <Dropdown.Item onSelect={actions.pickAvatar}>
                        <ImageUp className="size-4" />
                        Upload new photo
                      </Dropdown.Item>
                      <Dropdown.Item onSelect={actions.openRemoveAvatar}>
                        <Trash2 className="size-4" />
                        Remove photo
                      </Dropdown.Item>
                    </Dropdown.Panel>
                  </Dropdown>
                ) : (
                  <Button variant="secondary" onClick={actions.pickAvatar} disabled={state.isUploadingAvatar}>Upload</Button>
                )}
              </div>
              <Input
                aria-label="Profile photo"
                ref={fileInputRef}
                name="avatar"
                type="file"
                accept="image/*"
                onChange={actions.selectAvatar}
                style="ghost"
                className="hidden"
              />
            </div>
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="First name">
            <Input
              aria-label="First name"
              autoComplete="given-name"
              name="given-name"
              value={state.name}
              onChange={handleNameChange}
              placeholder="First name"
            />
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="Last name">
            <Input
              aria-label="Last name"
              autoComplete="family-name"
              name="family-name"
              value={state.surname}
              onChange={handleSurnameChange}
              placeholder="Last name"
            />
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="Email">
            <Input aria-label="Email" autoComplete="email" name="email" type="email" spellCheck={false} value={profile.email} disabled readOnly />
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="Duty">
            <Input
              aria-label="Duty"
              autoComplete="off"
              name="duty"
              value={state.duty}
              onChange={handleDutyChange}
              placeholder="e.g. Camera operator"
            />
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="Status">
            <div className="flex flex-col gap-1">
              <TextArea
                aria-label="Status"
                autoComplete="off"
                name="status"
                value={state.status}
                onChange={handleStatusChange}
                placeholder="What's on your mind?"
                rows={3}
                resize="vertical"
                maxLength={PROFILE_STATUS_MAX_LENGTH}
              />
              <Paragraph.xs className={meta.statusLength > PROFILE_STATUS_MAX_LENGTH ? "text-utility-red-700" : "text-tertiary"}>
                {meta.statusLength}/{PROFILE_STATUS_MAX_LENGTH}
              </Paragraph.xs>
            </div>
          </SettingsRow>

          <Divider className="my-6" />

          <SettingsRow label="Telegram">
            <TelegramLinkRow userId={profile.id} telegramChatId={profile.telegramChatId} />
          </SettingsRow>
        </Section.Body>
      </Section>

      {meta.hasChanges && (
        <>
          <Divider className="my-2" />
          <div className="flex justify-end gap-2 py-2">
            <Button variant="ghost" onClick={actions.discard} disabled={state.isSaving}>Discard</Button>
            <Button onClick={actions.save} disabled={!meta.canSave}>{state.isSaving ? "Saving…" : "Save changes"}</Button>
          </div>
        </>
      )}

      <AvatarCropperModal
        open={state.pendingAvatarFile !== null}
        file={state.pendingAvatarFile}
        onCancel={actions.cancelAvatarCrop}
        onConfirm={actions.uploadAvatar}
      />

      <RemoveAvatarModal
        open={state.removeAvatarOpen}
        onCancel={actions.closeRemoveAvatar}
        onConfirm={actions.removeAvatar}
        isRemoving={state.isUploadingAvatar}
      />
    </div>
  )
}
