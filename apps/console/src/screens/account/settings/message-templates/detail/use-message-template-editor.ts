import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { useWorkspace } from '@/lib/workspace-context'
import { DEFAULT_TEMPLATES, TEMPLATE_TOKENS, validateTemplate, type MessageType } from '@moc/notifications'
import { deleteNotificationTemplate, fetchNotificationTemplates, upsertNotificationTemplate } from '@/data/notification-templates'
import { routes } from '@/screens/console-routes'
import { messageTypeMeta } from '../meta'
import { templateHasContent } from '@/lib/template-editor-html'
import { useTemplateBodyEditor } from '@/hooks/use-template-body-editor'

const SETTINGS_TELEGRAM = `/${routes.settings}?tab=notifications`

export function useMessageTemplateEditor(messageType: MessageType) {
    const navigate = useNavigate()
    const { toast } = useFeedback()
    const { currentWorkspaceId } = useWorkspace()
    const templateMeta = messageTypeMeta(messageType)
    const defaultBody = DEFAULT_TEMPLATES[messageType]
    const [isLoading, setIsLoading] = useState(true)
    const [hasCustom, setHasCustom] = useState(false)
    const [savedBody, setSavedBody] = useState<string | null>(null)
    const [body, setBody] = useState(defaultBody)
    const [saving, setSaving] = useState(false)
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
    const [loadError, setLoadError] = useState<{ workspaceId: string | null; error: Error } | null>(null)
    const loadRequestRef = useRef(0)
    const variables = TEMPLATE_TOKENS[messageType].map(token => token.name)
    const bodyEditor = useTemplateBodyEditor(body, setBody)

    const load = useCallback(async () => {
        const requestId = ++loadRequestRef.current
        if (!currentWorkspaceId) {
            setLoadError({ workspaceId: null, error: new Error('Select a workspace before editing message templates.') })
            setIsLoading(false)
            return
        }
        const requestedWorkspaceId = currentWorkspaceId
        setIsLoading(true)
        setLoadError(null)
        try {
            const rows = await fetchNotificationTemplates(requestedWorkspaceId)
            if (loadRequestRef.current === requestId) {
                const row = rows.find((template) => template.messageType === messageType)
                setHasCustom(Boolean(row))
                setSavedBody(row?.body ?? null)
                setBody(row?.body ?? defaultBody)
                setLoadedWorkspaceId(requestedWorkspaceId)
            }
        } catch (reason: unknown) {
            if (loadRequestRef.current === requestId) {
                const error = reason instanceof Error ? reason : new Error('Could not load this message template.')
                setLoadError({ workspaceId: requestedWorkspaceId, error })
            }
        } finally {
            if (loadRequestRef.current === requestId) setIsLoading(false)
        }
    }, [currentWorkspaceId, defaultBody, messageType])

    useEffect(() => { void load() }, [load])

    const unknown = useMemo(() => validateTemplate(messageType, body), [body, messageType])
    const { editorHtml, unsupportedTags } = bodyEditor.state
    const unknownMessage = unknown.length ? `Unknown placeholder${unknown.length > 1 ? 's' : ''} for this message: ${unknown.map(name => `{{${name}}}`).join(', ')}` : ''
    const dirty = body !== (savedBody ?? defaultBody)
    const currentLoadError = loadError?.workspaceId === currentWorkspaceId ? loadError.error : null
    const isReady = currentWorkspaceId !== null && loadedWorkspaceId === currentWorkspaceId && currentLoadError === null && !isLoading
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

    function back() {
        navigate(SETTINGS_TELEGRAM)
    }

    const save = useCallback(async () => {
        if (!currentWorkspaceId || loadedWorkspaceId !== currentWorkspaceId || currentLoadError || isLoading) return false
        setSaving(true)
        try {
            await upsertNotificationTemplate({ workspaceId: currentWorkspaceId, scope: templateMeta.scope, messageType, body })
            setSavedBody(body)
            setHasCustom(true)
            toast({ title: 'Template saved', variant: 'success' })
            return true
        } catch (error) {
            toast({ title: "Couldn't save template", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
            return false
        } finally {
            setSaving(false)
        }
    }, [body, currentLoadError, currentWorkspaceId, isLoading, loadedWorkspaceId, messageType, templateMeta.scope, toast])

    const saveAndProceed = useCallback(async () => {
        if (await save() && blocker.state === 'blocked') blocker.proceed()
    }, [blocker, save])

    const discardAndProceed = useCallback(() => {
        setBody(savedBody ?? defaultBody)
        if (blocker.state === 'blocked') blocker.proceed()
    }, [blocker, defaultBody, savedBody])

    const cancelNavigation = useCallback(() => {
        if (blocker.state === 'blocked') blocker.reset()
    }, [blocker])

    const restoreDefault = useCallback(async () => {
        if (!currentWorkspaceId || loadedWorkspaceId !== currentWorkspaceId || currentLoadError || isLoading) return
        setSaving(true)
        try {
            await deleteNotificationTemplate({ workspaceId: currentWorkspaceId, scope: templateMeta.scope, messageType })
            setSavedBody(null)
            setHasCustom(false)
            setBody(defaultBody)
            toast({ title: 'Default restored', variant: 'success' })
        } catch (error) {
            toast({ title: "Couldn't restore default", description: error instanceof Error ? error.message : 'Unknown error', variant: 'error' })
        } finally {
            setSaving(false)
        }
    }, [currentLoadError, currentWorkspaceId, defaultBody, isLoading, loadedWorkspaceId, messageType, templateMeta.scope, toast])

    return {
        state: { isLoading, loadError: currentLoadError, hasCustom, body, saving, unknown, unknownMessage, editorHtml, unsupportedTags, dirty, canSave, navigationBlocked: blocker.state === 'blocked' },
        actions: { back, ...bodyEditor.actions, save, saveAndProceed, discardAndProceed, cancelNavigation, restoreDefault, retryLoad: load },
        templateMeta,
        textareaRef: bodyEditor.meta.textareaRef,
        variables,
    }
}
