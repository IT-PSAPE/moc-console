import { Button } from '@moc/ui/components/controls/button'
import { Divider } from '@moc/ui/components/display/divider'
import { Section } from '@moc/ui/components/display/section'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
import { Paragraph } from '@moc/ui/components/display/text'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Input } from '@moc/ui/components/form/input'
import { TextArea } from '@moc/ui/components/form/text-area'
import { updateWorkspace } from '@moc/data/mutate-workspace'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { useEffect, useMemo, useState } from 'react'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function WorkspaceTab() {
    const { role } = useAuth()
    const { workspaces, currentWorkspaceId, refresh } = useWorkspace()
    const { toast } = useFeedback()

    const canManage = role?.can_manage_roles === true
    const workspace = useMemo(
        () => workspaces.find((w) => w.id === currentWorkspaceId) ?? null,
        [workspaces, currentWorkspaceId],
    )

    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [description, setDescription] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (workspace) {
            setName(workspace.name)
            setSlug(workspace.slug)
            setDescription(workspace.description ?? '')
        }
    }, [workspace])

    if (!workspace) {
        return (
            <Paragraph.sm className="text-tertiary">
                No workspace selected.
            </Paragraph.sm>
        )
    }

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()
    const trimmedDescription = description.trim()
    const originalDescription = workspace.description ?? ''

    const hasChanges =
        trimmedName !== workspace.name ||
        trimmedSlug !== workspace.slug ||
        trimmedDescription !== originalDescription

    const slugValid = SLUG_PATTERN.test(trimmedSlug)
    const nameValid = trimmedName.length > 0
    const canSave = canManage && hasChanges && nameValid && slugValid && !isSaving

    async function handleSave() {
        if (!workspace || !canSave) return
        setIsSaving(true)
        try {
            await updateWorkspace(workspace.id, {
                name: trimmedName,
                slug: trimmedSlug,
                description: trimmedDescription.length > 0 ? trimmedDescription : null,
            })
            await refresh()
            toast({ title: 'Workspace updated', variant: 'success' })
        } catch (error) {
            toast({
                title: 'Could not update workspace',
                description: error instanceof Error ? error.message : 'Please try again.',
                variant: 'error',
            })
        } finally {
            setIsSaving(false)
        }
    }

    function handleDiscard() {
        if (!workspace) return
        setName(workspace.name)
        setSlug(workspace.slug)
        setDescription(workspace.description ?? '')
    }

    return (
        <div className="flex flex-col">
            <Section>
                <Section.Header title="Workspace details" />
                
                <Divider className="py-6" />

                <Section.Body>
                    <SettingsRow
                        label="Name"
                        description="Displayed across the app and in the workspace switcher."
                    >
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Workspace name"
                            disabled={!canManage}
                        />
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow label="Slug" description="Used in URLs. Lowercase letters, numbers, and hyphens only." >
                        <div className="flex flex-col gap-1">
                            <Input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="workspace-slug"
                                disabled={!canManage}
                            />
                            {trimmedSlug.length > 0 && !slugValid && (
                                <Paragraph.xs className="text-error">
                                    Use lowercase letters, numbers, and hyphens only.
                                </Paragraph.xs>
                            )}
                        </div>
                    </SettingsRow>

                    <Divider className="py-6" />

                    <SettingsRow label="Description" description="A short summary of what this workspace is for." >
                        <TextArea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this workspace for?"
                            disabled={!canManage}
                        />
                    </SettingsRow>
                </Section.Body>
            </Section>

            {canManage && hasChanges && (
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
        </div>
    )
}
