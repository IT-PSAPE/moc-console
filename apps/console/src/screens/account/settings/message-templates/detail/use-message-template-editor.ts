import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_TEMPLATES, TEMPLATE_TOKENS, validateTemplate, type MessageType } from '@moc/notifications'
import { deleteNotificationTemplate, fetchNotificationTemplates, upsertNotificationTemplate, type NotificationTemplate } from '@/data/notification-templates'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { messageTypeMeta } from '../meta'
import { templateHasContent } from '@/lib/template-editor-html'
import { useTemplateBodyEditor } from '@/hooks/use-template-body-editor'

export function useMessageTemplateEditor(messageType: MessageType) {
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const templateMeta = messageTypeMeta(messageType)
    const defaultBody = DEFAULT_TEMPLATES[messageType]
    const resource = useWorkspaceResource({ emptyValue: [] as NotificationTemplate[], fetcher: fetchNotificationTemplates, resource: 'notification-templates', workspaceId: currentWorkspaceId })
    const updateResource = resource.updateData
    const loadResource = resource.load
    const [draft, setDraft] = useState<{ workspaceId: string | null; messageType: MessageType; body: string } | null>(null)
    const savedTemplate = resource.data.find((template) => template.messageType === messageType)
    const savedBody = savedTemplate?.body ?? null
    const hasCustom = Boolean(savedTemplate)
    const hasCurrentDraft = draft?.workspaceId === currentWorkspaceId && draft.messageType === messageType
    const body = hasCurrentDraft ? draft.body : savedBody ?? defaultBody
    const [saving, setSaving] = useState(false)
    const variables = TEMPLATE_TOKENS[messageType].map(token => token.name)
    const updateBody = useCallback((nextBody: string) => {
        setDraft({ workspaceId: currentWorkspaceId, messageType, body: nextBody })
    }, [currentWorkspaceId, messageType])
    const bodyEditor = useTemplateBodyEditor(body, updateBody)
    const isLoading = resource.isLoading
    const loadError = currentWorkspaceId ? (resource.hasData ? null : resource.error) : new Error('Select a workspace before editing message templates.')

    const unknown = useMemo(() => validateTemplate(messageType, body), [body, messageType])
    const { editorHtml, unsupportedTags } = bodyEditor.state
    const unknownMessage = unknown.length ? `Unknown placeholder${unknown.length > 1 ? 's' : ''} for this message: ${unknown.map(name => `{{${name}}}`).join(', ')}` : ''
    const dirty = body !== (savedBody ?? defaultBody)
    const currentLoadError = loadError
    const isReady = currentWorkspaceId !== null && currentLoadError === null && !isLoading
    const canSave = isReady && dirty && unknown.length === 0 && templateHasContent(body) && !saving
    const blocker = useBlocker(dirty)

    useEffect(() => {
        if (!dirty) return
        function preventUnload(event: BeforeUnloadEvent) {
            event.preventDefault()
        }
        window.addEventListener('beforeunload', preventUnload)
        return () => window.removeEventListener('beforeunload', preventUnload)
    }, [dirty])

    const save = useCallback(async () => {
        if (!currentWorkspaceId || currentLoadError || isLoading) return false
        setSaving(true)
        try {
            const savedTemplate = await upsertNotificationTemplate({ workspaceId: currentWorkspaceId, scope: templateMeta.scope, messageType, body })
            updateResource((rows) => [...rows.filter((template) => template.messageType !== messageType), savedTemplate])
            setDraft(null)
            toast({ title: 'Template saved', variant: 'success' })
            return true
        } catch (error) {
            toast({ title: "Couldn't save template", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
            return false
        } finally {
            setSaving(false)
        }
    }, [body, currentLoadError, currentWorkspaceId, isLoading, messageType, templateMeta.scope, toast, updateResource])

    const saveAndProceed = useCallback(async () => {
        if (await save() && blocker.state === 'blocked') blocker.proceed()
    }, [blocker, save])

    const discardAndProceed = useCallback(() => {
        setDraft(null)
        if (blocker.state === 'blocked') blocker.proceed()
    }, [blocker])

    const cancelNavigation = useCallback(() => {
        if (blocker.state === 'blocked') blocker.reset()
    }, [blocker])

    const restoreDefault = useCallback(async () => {
        if (!currentWorkspaceId || currentLoadError || isLoading) return
        setSaving(true)
        try {
            await deleteNotificationTemplate({ workspaceId: currentWorkspaceId, scope: templateMeta.scope, messageType })
            updateResource((rows) => rows.filter((template) => template.messageType !== messageType))
            setDraft(null)
            toast({ title: 'Default restored', variant: 'success' })
        } catch (error) {
            toast({ title: "Couldn't restore default", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setSaving(false)
        }
    }, [currentLoadError, currentWorkspaceId, isLoading, messageType, templateMeta.scope, toast, updateResource])

    const retryLoad = useCallback(() => loadResource(true), [loadResource])

    return {
        state: { isLoading, loadError: currentLoadError, hasCustom, body, saving, unknown, unknownMessage, editorHtml, unsupportedTags, dirty, canSave, navigationBlocked: blocker.state === 'blocked' },
        actions: { ...bodyEditor.actions, save, saveAndProceed, discardAndProceed, cancelNavigation, restoreDefault, retryLoad },
        templateMeta,
        textareaRef: bodyEditor.meta.textareaRef,
        variables,
    }
}
