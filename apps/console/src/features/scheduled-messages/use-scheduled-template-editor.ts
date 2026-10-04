import { useRef, useState, type ChangeEvent } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { SCHEDULED_DEFAULT_BODIES, SCHEDULED_FIELDS, validateScheduledBody, validateScheduledFields, type ScheduledMessageType, type ScheduledTemplate } from '@moc/notifications'
import { useTemplateBodyEditor } from '@/hooks/use-template-body-editor'
import { useUnsavedNavigationGuard } from '@/hooks/use-unsaved-navigation-guard'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from './scheduled-messages-context'
import { scheduledMessagePreview } from './scheduled-message-preview'

type TemplateDraft = { id?: string; name: string; messageType: ScheduledMessageType; body: string; fields: Record<string, string>; audience: string[]; requireArrival: boolean }
const typeItems = [{ value: 'announcement', label: 'Announcement' }, { value: 'pre_attendance', label: 'Pre-attendance' }]
function initialDraft(row?: ScheduledTemplate): TemplateDraft {
    return row ? { id: row.id, name: row.name, messageType: row.message_type, body: row.body, fields: row.fields, audience: row.audience, requireArrival: row.require_arrival } : { name: '', messageType: 'announcement', body: SCHEDULED_DEFAULT_BODIES.announcement, fields: { title: '', instructions: '' }, audience: [], requireArrival: false }
}
export function useScheduledTemplateEditor() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { state: messages, actions: messageActions } = useScheduledMessagesContext()
    const row = messages.snapshot.templates.find(t => t.id === id)
    const [draft, setDraft] = useState<TemplateDraft>(() => initialDraft(row))
    const [saved, setSaved] = useState(() => JSON.stringify(initialDraft(row)))
    const [creationId] = useState(() => crypto.randomUUID())
    const saving = useRef(false)
    const [error, setError] = useState('')
    function changeBody(body: string): void { setDraft(current => ({ ...current, body })) }
    const variables = SCHEDULED_FIELDS[draft.messageType].map(field => field.key)
    const bodyEditor = useTemplateBodyEditor(draft.body, changeBody)
    const preview = scheduledMessagePreview({ ...draft, id: draft.id ?? 'preview' }, messages.snapshot.members)
    function ignorePreviewChange(): void { /* Generated attendees are not editable template content. */ }
    function changeName(event: ChangeEvent<HTMLInputElement>): void { setDraft(current => ({ ...current, name: event.target.value })) }
    function changeType(value: string): void {
        const messageType = value as ScheduledMessageType
        const defaultType = messages.snapshot.memberTypes.find(t => t.is_default)
        setDraft(current => ({ ...current, messageType, body: SCHEDULED_DEFAULT_BODIES[messageType], audience: current.audience.length ? current.audience : defaultType ? [defaultType.id] : [] }))
    }
    function changeField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
        const { name, value } = event.target
        setDraft(current => ({ ...current, fields: { ...current.fields, [name]: value } }))
    }
    function changeAudience(event: ChangeEvent<HTMLInputElement>): void {
        const { value, checked } = event.target
        setDraft(current => ({ ...current, audience: checked ? [...current.audience, value] : current.audience.filter(id => id !== value) }))
    }
    function changeArrival(event: ChangeEvent<HTMLInputElement>): void { setDraft(current => ({ ...current, requireArrival: event.target.checked })) }
    async function save(): Promise<boolean> {
        if (saving.current || messages.busy) return false
        try { validateScheduledBody(draft.messageType, draft.body); validateScheduledFields(draft.messageType, draft.fields) }
        catch (e) { setError(e instanceof Error ? e.message : 'Check the template'); return false }
        if (!draft.name.trim()) { setError('Enter a template name'); return false }
        if (draft.messageType === 'pre_attendance' && !draft.audience.length) { setError('Select at least one member type'); return false }
        setError('')
        saving.current = true
        try {
            if (!await messageActions.mutate('template.save', draft.id ? draft : { ...draft, creationId })) return false
            const persisted = { ...draft, id: draft.id ?? creationId }
            // The router must see a clean draft before successful-save navigation.
            flushSync(() => { setDraft(persisted); setSaved(JSON.stringify(persisted)) })
            return true
        } finally { saving.current = false }
    }
    function discard(): void { setDraft(JSON.parse(saved) as TemplateDraft) }
    const guard = useUnsavedNavigationGuard({ isDirty: JSON.stringify(draft) !== saved, save, discard })
    async function saveAndBack(): Promise<void> {
        if (await save()) { messageActions.setTab('templates'); navigate(`/${routes.scheduledMessages}`) }
    }
    return {
        state: { draft, busy: messages.busy, loading: messages.loading, error: error || messages.error, missing: Boolean(id && !messages.loading && !row), navigationBlocked: guard.state.isBlocked, ...bodyEditor.state },
        actions: { changeName, changeType, changeField, changeAudience, changeArrival, saveAndBack, ignorePreviewChange, ...bodyEditor.actions, ...guard.actions },
        meta: { typeItems, fields: SCHEDULED_FIELDS[draft.messageType], variables, memberTypes: messages.snapshot.memberTypes, preview, isAttendance: draft.messageType === 'pre_attendance', textareaRef: bodyEditor.meta.textareaRef },
    }
}
