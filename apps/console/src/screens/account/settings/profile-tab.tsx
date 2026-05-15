import { Button } from '@moc/ui/components/controls/button'
import { Avatar } from '@moc/ui/components/display/avatar'
import { Divider } from '@moc/ui/components/display/divider'
import { Section } from '@moc/ui/components/display/section'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Paragraph } from '@moc/ui/components/display/text'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Input } from '@moc/ui/components/form/input'
import { removeUserAvatar, updateUserProfile, uploadUserAvatar } from '@moc/data/fetch-users'
import { AvatarCropperModal } from '@/features/account/avatar-cropper-modal'
import { useAuth } from '@/lib/auth-context'
import { TelegramLinkRow } from '@/screens/account/telegram-link-row'
import { useEffect, useRef, useState } from 'react'

export function ProfileTab() {
    const { profile, refreshProfile } = useAuth()
    const { toast } = useFeedback()

    const [name, setName] = useState('')
    const [surname, setSurname] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (profile) {
            setName(profile.name)
            setSurname(profile.surname)
        }
    }, [profile])

    if (!profile) {
        return (
            <Paragraph.sm className="text-tertiary">
                Sign in to view your profile.
            </Paragraph.sm>
        )
    }

    const trimmedName = name.trim()
    const trimmedSurname = surname.trim()

    const hasChanges =
        trimmedName !== profile.name || trimmedSurname !== profile.surname
    const nameValid = trimmedName.length > 0
    const surnameValid = trimmedSurname.length > 0
    const canSave = hasChanges && nameValid && surnameValid && !isSaving

    async function handleSave() {
        if (!profile || !canSave) return
        setIsSaving(true)
        try {
            await updateUserProfile(profile.id, {
                name: trimmedName,
                surname: trimmedSurname,
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

    async function handleRemoveAvatar() {
        if (!profile) return
        setIsUploadingAvatar(true)
        try {
            await removeUserAvatar(profile.id)
            await refreshProfile()
            toast({ title: 'Photo removed', variant: 'success' })
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
                                <Button variant="secondary" onClick={handlePickAvatar} disabled={isUploadingAvatar}>
                                    {profile.avatarUrl ? 'Change' : 'Upload'}
                                </Button>
                                {profile.avatarUrl && (
                                    <Button variant="ghost" onClick={handleRemoveAvatar} disabled={isUploadingAvatar}>
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
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
        </div>
    )
}
