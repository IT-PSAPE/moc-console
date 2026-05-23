import { Button } from '@moc/ui/components/controls/button'
import { Avatar } from '@moc/ui/components/display/avatar'
import { Divider } from '@moc/ui/components/display/divider'
import { Section } from '@moc/ui/components/display/section'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Paragraph } from '@moc/ui/components/display/text'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Input } from '@moc/ui/components/form/input'
import { TextArea } from '@moc/ui/components/form/text-area'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { ChevronDown, ImageUp, Trash2 } from 'lucide-react'
import { removeUserAvatar, updateUserProfile, uploadUserAvatar } from '@/data/fetch-users'
import { AvatarCropperModal } from '@/features/account/avatar-cropper-modal'
import { RemoveAvatarModal } from '@/features/account/remove-avatar-modal'
import { useAuth } from '@/lib/auth-context'
import { TelegramLinkRow } from '@/screens/account/telegram-link-row'
import { useEffect, useRef, useState } from 'react'

export function ProfileTab() {
    const { profile, refreshProfile } = useAuth()
    const { toast } = useFeedback()

    const [name, setName] = useState('')
    const [surname, setSurname] = useState('')
    const [duty, setDuty] = useState('')
    const [status, setStatus] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (profile) {
            setName(profile.name)
            setSurname(profile.surname)
            setDuty(profile.currentDuty ?? '')
            setStatus(profile.statusMessage ?? '')
        }
    }, [profile])

    if (!profile) {
        return (
            <Paragraph.sm className="text-tertiary">
                Sign in to view your profile.
            </Paragraph.sm>
        )
    }

    const STATUS_MAX = 500

    const trimmedName = name.trim()
    const trimmedSurname = surname.trim()
    const trimmedDuty = duty.trim()
    const trimmedStatus = status.trim()

    const dutyChanged = trimmedDuty !== (profile.currentDuty ?? '')
    const statusChanged = trimmedStatus !== (profile.statusMessage ?? '')
    const hasChanges =
        trimmedName !== profile.name ||
        trimmedSurname !== profile.surname ||
        dutyChanged ||
        statusChanged
    const nameValid = trimmedName.length > 0
    const surnameValid = trimmedSurname.length > 0
    const statusValid = trimmedStatus.length <= STATUS_MAX
    const canSave = hasChanges && nameValid && surnameValid && statusValid && !isSaving

    async function handleSave() {
        if (!profile || !canSave) return
        setIsSaving(true)
        try {
            await updateUserProfile(profile.id, {
                name: trimmedName,
                surname: trimmedSurname,
                current_duty: trimmedDuty.length > 0 ? trimmedDuty : null,
                status_message: trimmedStatus.length > 0 ? trimmedStatus : null,
            })
            await refreshProfile()
            toast({ title: 'Profile updated', variant: 'success' })
        } catch (error) {
            toast({
                title: 'Could not update profile',
                description: error instanceof Error ? error.message : 'Please try again.',
                variant: 'error',
            })
        } finally {
            setIsSaving(false)
        }
    }

    function handleDiscard() {
        if (!profile) return
        setName(profile.name)
        setSurname(profile.surname)
        setDuty(profile.currentDuty ?? '')
        setStatus(profile.statusMessage ?? '')
    }

    const initials = `${profile.name[0] ?? ''}${profile.surname[0] ?? ''}`

    function handlePickAvatar() {
        fileInputRef.current?.click()
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null
        event.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Pick an image file', variant: 'error' })
            return
        }
        setPendingAvatarFile(file)
    }

    async function handleConfirmAvatar(blob: Blob) {
        if (!profile) return
        setIsUploadingAvatar(true)
        try {
            await uploadUserAvatar(profile.id, blob)
            await refreshProfile()
            toast({ title: 'Photo updated', variant: 'success' })
            setPendingAvatarFile(null)
        } catch (error) {
            toast({
                title: 'Could not upload photo',
                description: error instanceof Error ? error.message : 'Please try again.',
                variant: 'error',
            })
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    async function handleConfirmRemoveAvatar() {
        if (!profile) return
        setIsUploadingAvatar(true)
        try {
            await removeUserAvatar(profile.id)
            await refreshProfile()
            toast({ title: 'Photo removed', variant: 'success' })
            setRemoveAvatarOpen(false)
        } catch (error) {
            toast({
                title: 'Could not remove photo',
                description: error instanceof Error ? error.message : 'Please try again.',
                variant: 'error',
            })
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    return (
        <div className="flex flex-col">
            <Section>
                <Section.Header title="Your profile" />

                <Divider className="py-6" />

                <Section.Body>
                    <SettingsRow
                        label="Photo"
                        description="A square image works best. We'll let you reposition it before saving."
                    >
                        <div className="flex items-center gap-4">
                            {profile.avatarUrl ? (
                                <Avatar src={profile.avatarUrl} name={initials} size="xl" />
                            ) : (
                                <Avatar.initials name={initials} size="xl" />
                            )}
                            <div className="flex gap-2">
                                {profile.avatarUrl ? (
                                    <Dropdown placement="bottom-start">
                                        <Dropdown.Trigger>
                                            <Button variant="secondary" icon={<ChevronDown />} iconPosition="trailing" disabled={isUploadingAvatar}>
                                                Change
                                            </Button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            <Dropdown.Item onSelect={handlePickAvatar}>
                                                <ImageUp className="size-4" />
                                                Upload new photo
                                            </Dropdown.Item>
                                            <Dropdown.Item onSelect={() => setRemoveAvatarOpen(true)}>
                                                <Trash2 className="size-4" />
                                                Remove photo
                                            </Dropdown.Item>
                                        </Dropdown.Panel>
                                    </Dropdown>
                                ) : (
                                    <Button variant="secondary" onClick={handlePickAvatar} disabled={isUploadingAvatar}>
                                        Upload
                                    </Button>
                                )}
                            </div>
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style="ghost"
                                className="hidden"
                            />
                        </div>
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow
                        label="First name"
                        description="Shown next to your activity and assignments."
                    >
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="First name"
                        />
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow
                        label="Last name"
                        description="Shown next to your first name throughout the app."
                    >
                        <Input
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            placeholder="Last name"
                        />
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow
                        label="Email"
                        description="The address you use to sign in."
                    >
                        <Input value={profile.email} disabled readOnly />
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow
                        label="Duty"
                        description="Your current role on the team. Update it when your duty changes."
                    >
                        <Input
                            value={duty}
                            onChange={(e) => setDuty(e.target.value)}
                            placeholder="e.g. Camera Op, Audio Engineer"
                        />
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow
                        label="Status"
                        description="A short note about you — say something that shows your personality."
                    >
                        <div className="flex flex-col gap-1">
                            <TextArea
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                placeholder="What's on your mind?"
                                rows={3}
                                resize="vertical"
                                maxLength={STATUS_MAX}
                            />
                            <Paragraph.xs className={status.trim().length > STATUS_MAX ? 'text-utility-red-700' : 'text-tertiary'}>
                                {status.trim().length}/{STATUS_MAX}
                            </Paragraph.xs>
                        </div>
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow
                        label="Telegram"
                        description="Link your Telegram account to receive notifications."
                    >
                        <TelegramLinkRow userId={profile.id} telegramChatId={profile.telegramChatId} />
                    </SettingsRow>
                </Section.Body>
            </Section>

            {hasChanges && (
                <>
                    <Divider className="my-2" />
                    <div className="flex justify-end gap-2 py-2">
                        <Button variant="ghost" onClick={handleDiscard} disabled={isSaving}>
                            Discard
                        </Button>
                        <Button onClick={handleSave} disabled={!canSave}>
                            {isSaving ? 'Saving...' : 'Save changes'}
                        </Button>
                    </div>
                </>
            )}

            <AvatarCropperModal
                open={pendingAvatarFile !== null}
                file={pendingAvatarFile}
                onCancel={() => setPendingAvatarFile(null)}
                onConfirm={handleConfirmAvatar}
            />

            <RemoveAvatarModal
                open={removeAvatarOpen}
                onCancel={() => setRemoveAvatarOpen(false)}
                onConfirm={handleConfirmRemoveAvatar}
                isRemoving={isUploadingAvatar}
            />
        </div>
    )
}
