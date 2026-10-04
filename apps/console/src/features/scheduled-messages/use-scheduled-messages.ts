import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { SCHEDULED_FIELDS, scheduledOccurrenceSummary, validateScheduledFields, type ScheduledEditScope, type ScheduledOccurrence, type ScheduledSnapshot } from '@moc/notifications'
import { useWorkspace } from '@/lib/workspace-context'
import { routes } from '@/screens/console-routes'
import { formatUtcIsoInTimezone } from '@moc/utils/zoned-date-time'
import { fetchScheduledMessages, mutateScheduledMessage } from './services/scheduled-message-service'
import { scheduledMessagePreview } from './scheduled-message-preview'

const empty: ScheduledSnapshot = { templates: [], schedules: [], occurrences: [], memberTypes: [], groups: [], members: [] }
const frequencyItems = [{ value: 'once', label: 'Does not repeat' }, { value: 'daily', label: 'Daily' }, { value: 'weekdays', label: 'Weekdays' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }]
const scopeItems = [{ value: 'occurrence', label: 'This occurrence' }, { value: 'future', label: 'This and future occurrences' }, { value: 'series', label: 'Entire series' }]
type ScheduleDraft = { templateId: string; fields: Record<string, string>; groupChatId: string; threadId: string; startsOn: string; untilOn: string; frequency: string; timezone: string; expiryHours: string; autoSend: boolean }
type EditDraft = { id: string; revision: number; field: string; value: string; scope: ScheduledEditScope }
function defaultSchedule(): ScheduleDraft {
    return { templateId: '', fields: {}, groupChatId: '', threadId: '', startsOn: new Date().toLocaleDateString('en-CA'), untilOn: '', frequency: 'once', timezone: 'Africa/Johannesburg', expiryHours: '72', autoSend: true }
}

export function useScheduledMessages() {
    const { currentWorkspaceId } = useWorkspace()
    const navigate = useNavigate()
    const [snapshot, setSnapshot] = useState(empty)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const mutating = useRef(false)
    const [error, setError] = useState('')
    const [loadError, setLoadError] = useState('')
    const [tab, setTab] = useState('active')
    const [schedule, setSchedule] = useState<ScheduleDraft>(defaultSchedule)
    const [editing, setEditing] = useState<ScheduledOccurrence | null>(null)
    const [edit, setEdit] = useState<EditDraft>({ id: '', revision: 0, field: 'title', value: '', scope: 'occurrence' })
    const [confirmation, setConfirmation] = useState<{ op: string; data: unknown; title: string; label: string; description: string } | null>(null)
    const reload = useCallback(async () => {
        if (!currentWorkspaceId) return
        setLoading(true)
        try { setSnapshot(await fetchScheduledMessages(currentWorkspaceId)); setError(''); setLoadError('') }
        catch (e) { setLoadError(e instanceof Error ? e.message : 'Loading failed') }
        finally { setLoading(false) }
    }, [currentWorkspaceId])
    useEffect(() => { setSnapshot(empty); setEditing(null); setSchedule(defaultSchedule()); void reload() }, [reload])
    useEffect(() => {
        const timer = window.setInterval(() => setSnapshot(current => ({ ...current, occurrences: current.occurrences.filter(o => Date.parse(o.expires_at) > Date.now()) })), 15_000)
        return () => window.clearInterval(timer)
    }, [])
    async function mutate(op: string, data: unknown): Promise<boolean> {
        if (!currentWorkspaceId || mutating.current) return false
        mutating.current = true
        setBusy(true); setError('')
        try { setSnapshot(await mutateScheduledMessage(currentWorkspaceId, op, data)); return true }
        catch (e) { setError(e instanceof Error ? e.message : 'Operation failed'); return false }
        finally { mutating.current = false; setBusy(false) }
    }
    const startSchedule = useCallback((templateId: string) => {
        const template = snapshot.templates.find(t => t.id === templateId)
        setSchedule({ ...defaultSchedule(), templateId: template?.id ?? '', fields: { ...template?.fields } })
        setError('')
    }, [snapshot.templates])
    function changeSchedule(event: ChangeEvent<HTMLInputElement>): void {
        const { name, value } = event.target
        setSchedule(current => ({ ...current, [name]: value }))
    }
    function changeScheduleField(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
        const { name, value } = event.target
        setSchedule(current => ({ ...current, fields: { ...current.fields, [name]: value } }))
    }
    function setTemplateId(value: string): void {
        const template = snapshot.templates.find(t => t.id === value)
        setSchedule(current => ({ ...current, templateId: value, fields: { ...template?.fields } }))
    }
    function setGroup(value: string): void { setSchedule(current => ({ ...current, groupChatId: value, threadId: '' })) }
    function setTopic(value: string): void { setSchedule(current => ({ ...current, threadId: value === 'main' ? '' : value })) }
    function setFrequency(value: string): void { setSchedule(current => ({ ...current, frequency: value, untilOn: value === 'once' ? '' : current.untilOn })) }
    function changeAutoSend(event: ChangeEvent<HTMLInputElement>): void { setSchedule(current => ({ ...current, autoSend: event.target.checked })) }
    function requestSchedule(): void {
        const template = snapshot.templates.find(t => t.id === schedule.templateId)
        if (!template) return
        try { validateScheduledFields(template.message_type, schedule.fields) }
        catch (e) { setError(e instanceof Error ? e.message : 'Check message values'); return }
        const group = snapshot.groups.find(g => g.chat_id === schedule.groupChatId)
        const topic = group?.telegram_group_topics.find(t => String(t.thread_id) === schedule.threadId)
        const destination = [group?.title, topic?.name].filter(Boolean).join(' / ')
        const repeat = frequencyItems.find(item => item.value === schedule.frequency)?.label
        const end = schedule.frequency !== 'once' && schedule.untilOn ? ` through ${schedule.untilOn}` : ''
        setConfirmation({ op: 'schedule.create', title: 'Schedule this message?', label: 'Schedule message', data: { ...schedule, threadId: schedule.threadId ? Number(schedule.threadId) : null, untilOn: schedule.untilOn || null, expiryHours: Number(schedule.expiryHours) }, description: `${schedule.fields.title} → ${destination}. ${schedule.startsOn} · ${repeat}${end}. ${schedule.autoSend ? 'Automatic delivery runs once a day.' : 'You will send this manually with Send now.'}` })
    }
    function selectOccurrence(id: string): void {
        const o = snapshot.occurrences.find(row => row.id === id)
        if (!o || !['scheduled', 'sent'].includes(o.state)) return
        setError(''); setEditing(o); setEdit({ id: o.id, revision: o.revision, field: 'title', value: o.fields.title, scope: 'occurrence' })
    }
    function changeEditField(field: string): void {
        if (!editing) return
        const s = snapshot.schedules.find(row => row.id === editing.schedule_id)
        const value = field === 'sendOn' ? editing.send_on : field === 'expiresAt' ? editing.expires_at : field === 'expiryHours' ? String(s?.expiry_hours ?? 72) : editing.fields[field] ?? ''
        setEdit(current => ({ ...current, field, value, scope: 'occurrence' }))
    }
    function changeEditValue(event: ChangeEvent<HTMLTextAreaElement>): void { setEdit(current => ({ ...current, value: event.target.value })) }
    function changeScope(scope: string): void { setEdit(current => ({ ...current, scope: scope as ScheduledEditScope })) }
    function requestEdit(): void { setConfirmation({ op: 'occurrence.edit', title: 'Apply this change?', label: 'Apply change', data: edit, description: `Apply ${edit.field}: ${edit.value || '(empty)'} to ${edit.scope === 'occurrence' ? 'this occurrence' : edit.scope === 'future' ? 'this and future occurrences' : 'the entire series'}? Attendance responses will be retained.` }) }
    function requestSend(id: string): void { setError(''); setConfirmation({ op: 'occurrence.send', title: 'Send this message now?', label: 'Send now', data: { id }, description: 'This will post the occurrence to its Telegram group.' }) }
    function requestTemplateDelete(event: MouseEvent<HTMLButtonElement>): void {
        const template = snapshot.templates.find(row => row.id === event.currentTarget.dataset.templateId)
        if (!template || busy) return
        setError('')
        setConfirmation({ op: 'template.delete', title: 'Delete template?', label: 'Delete template', data: { id: template.id }, description: `Delete “${template.name}” from your template library? Existing scheduled messages and attendance responses will be kept. This cannot be undone.` })
    }
    function changeEditorOpen(open: boolean): void { if (!open && !busy) setEditing(null) }
    function changeConfirmationOpen(open: boolean): void { if (!open && !busy) setConfirmation(null) }
    async function confirm(): Promise<void> {
        if (!confirmation) return
        const op = confirmation.op
        if (await mutate(op, confirmation.data)) {
            setConfirmation(null); setEditing(null)
            if (op === 'schedule.create') { setSchedule(defaultSchedule()); setTab('active'); navigate(`/${routes.scheduledMessages}`) }
        }
    }
    async function syncCommands(): Promise<void> { await mutate('commands.sync', {}) }
    function ignorePreviewChange(): void { /* The message preview is read-only. */ }
    function occurrenceRow(o: ScheduledOccurrence): ScheduledOccurrence & { summary: string } {
        const timezone = snapshot.schedules.find(s => s.id === o.schedule_id)?.timezone ?? 'UTC'
        const dates = { sendOn: formatUtcIsoInTimezone(o.send_on, 'UTC', { dateStyle: 'medium' }), expiresAt: formatUtcIsoInTimezone(o.expires_at, timezone, { timeZoneName: 'short' }) }
        return { ...o, summary: scheduledOccurrenceSummary(o, dates) }
    }
    const selectedSchedule = snapshot.schedules.find(s => s.id === editing?.schedule_id)
    const selectedTemplate = snapshot.templates.find(t => t.id === schedule.templateId)
    const preview = selectedTemplate ? scheduledMessagePreview({ id: selectedTemplate.id, messageType: selectedTemplate.message_type, body: selectedTemplate.body, fields: schedule.fields, requireArrival: selectedTemplate.require_arrival, audience: selectedTemplate.audience }, snapshot.members) : { html: '', error: '', attendeeCount: 0 }
    const templateRows = snapshot.templates.map(t => ({ ...t, label: t.message_type === 'pre_attendance' ? 'Pre-attendance' : 'Announcement', editPath: `/${routes.scheduledTemplateDetail.replace(':id', t.id)}`, usePath: `/${routes.scheduledMessageNew}?template=${encodeURIComponent(t.id)}` }))
    const fieldItems = editing ? [...SCHEDULED_FIELDS[editing.message_type].map(f => ({ value: f.key, label: f.label })), ...(editing.state === 'scheduled' ? [{ value: 'sendOn', label: 'Send date' }] : []), { value: 'expiresAt', label: 'Expiry date (ISO timestamp)' }, { value: 'expiryHours', label: 'Expiry hours from send date' }] : []
    const topics = snapshot.groups.find(g => g.chat_id === schedule.groupChatId)?.telegram_group_topics ?? []
    const topicItems = [{ value: 'main', label: 'General' }, ...topics.filter(t => !t.closed).map(t => ({ value: String(t.thread_id), label: t.name }))]
    return {
        state: { snapshot, schedule, editing, edit, confirmation, error, loadError, loading, busy, tab },
        actions: { reload, mutate, setTab, startSchedule, changeSchedule, changeScheduleField, setTemplateId, setGroup, setTopic, setFrequency, changeAutoSend, requestSchedule, selectOccurrence, changeEditField, changeEditValue, changeScope, requestEdit, requestSend, requestTemplateDelete, changeEditorOpen, changeConfirmationOpen, confirm, syncCommands, ignorePreviewChange },
        meta: { frequencyItems, scopeItems, fieldItems, topicItems, selectedTemplate, templateRows, previewHtml: preview.html, previewError: preview.error, isAttendance: selectedTemplate?.message_type === 'pre_attendance', scheduleFields: selectedTemplate ? SCHEDULED_FIELDS[selectedTemplate.message_type] : [], hasTopics: topicItems.length > 1, isRecurring: schedule.frequency !== 'once', occurrences: snapshot.occurrences.map(occurrenceRow), templateItems: snapshot.templates.map(t => ({ value: t.id, label: t.name })), groupItems: snapshot.groups.map(g => ({ value: g.chat_id, label: g.title })), showScope: selectedSchedule?.frequency !== 'once' && !['sendOn', 'expiresAt'].includes(edit.field) },
    }
}
