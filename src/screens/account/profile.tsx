import { Button } from '@/components/controls/button'
import { Avatar } from '@/components/display/avatar'
import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { MetaRow } from '@/components/display/meta-row'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { Input } from '@/components/form/input'
import { updateUserProfile } from '@/data/fetch-users'
import { useAuth } from '@/lib/auth-context'
import { TelegramLinkRow } from '@/screens/account/telegram-link-row'
import { Mail, MessageCircle, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { routes } from '@/screens/console-routes'

export function ProfileScreen() {
    const { profile, role, loading } = useAuth()
    const { toast } = useFeedback()

    const [name, setName] = useState('')
    const [surname, setSurname] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (profile) {
            setName(profile.name)
            setSurname(profile.surname)
        }
    }, [profile])

    if (!loading && !profile) {
        return <Navigate to={`/${routes.login}`} replace />
    }

    const initials = profile ? `${profile.name[0] ?? ''}${profile.surname[0] ?? ''}` : ''
    const displayName = profile ? `${profile.name} ${profile.surname}` : ''
    const hasChanges = !!profile && (name.trim() !== profile.name || surname.trim() !== profile.surname)
    const canSave = hasChanges && name.trim().length > 0 && surname.trim().length > 0 && !isSaving

    async function handleSave() {
        if (!profile || !canSave) return
        setIsSaving(true)
        try {
            await updateUserProfile(profile.id, { name: name.trim(), surname: surname.trim() })
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

    return (
        <section className="mx-auto max-w-content-sm">
            <Header.Root className="p-4 pt-8">
                <Header.Lead className="gap-2">
                    <Title.h6>Profile</Title.h6>
                    <Paragraph.sm className="text-tertiary">
                        Update your personal details. Your email and role are managed by an administrator.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Divider className="px-4 my-2" />

            <div className="p-4 flex items-center gap-4">
                <Avatar.initials name={initials} size="xl" />
                <div className="flex flex-col">
                    <Label.lg>{displayName}</Label.lg>
                    <Paragraph.sm className="text-tertiary">{profile?.email}</Paragraph.sm>
                </div>
            </div>

            <Divider className="px-4 my-2" />

            <div className="p-4">
                <Label.md className="block pb-3">Personal details</Label.md>
                <div className="space-y-3">
                    <MetaRow icon={<User className="size-4" />} label="First name">
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="First name"
                            className="max-w-64"
                            style="ghost"
                        />
                    </MetaRow>

                    <MetaRow icon={<User className="size-4" />} label="Last name">
                        <Input
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            placeholder="Last name"
                            className="max-w-64"
                            style="ghost"
                        />
                    </MetaRow>

                    <MetaRow icon={<Mail className="size-4" />} label="Email">
                        <Paragraph.sm>{profile?.email}</Paragraph.sm>
                    </MetaRow>

                    <MetaRow icon={<Shield className="size-4" />} label="Role">
                        <Paragraph.sm className="capitalize">{role?.name ?? 'No role'}</Paragraph.sm>
                    </MetaRow>

                    <MetaRow icon={<MessageCircle className="size-4" />} label="Telegram">
                        {profile && (
                            <TelegramLinkRow userId={profile.id} telegramChatId={profile.telegramChatId} />
                        )}
                    </MetaRow>
                </div>
            </div>

            {hasChanges && (
                <>
                    <Divider className="px-4 my-2" />
                    <div className="p-4 flex justify-end gap-2">
                        <Button variant="ghost" onClick={handleDiscard} disabled={isSaving}>
                            Discard
                        </Button>
                        <Button onClick={handleSave} disabled={!canSave}>
                            {isSaving ? 'Saving...' : 'Save changes'}
                        </Button>
                    </div>
                </>
            )}
        </section>
    )
}
