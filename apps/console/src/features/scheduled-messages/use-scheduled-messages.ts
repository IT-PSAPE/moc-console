import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_TIMEZONE, validateScheduledAttendanceGroups, validateScheduledBody, type ScheduledAttendanceGroup, type ScheduledEditScope, type ScheduledFrequency, type ScheduledOccurrence, type ScheduledSnapshot } from '@moc/notifications'
import { useWorkspace } from '@/lib/workspace-context'
import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { routes } from '@/screens/console-routes'
import { fetchScheduledMessages, mutateScheduledMessage } from './services/scheduled-message-service'
import { scheduledTimestamp } from './scheduled-timestamps'
import { useScheduledMessageHistory } from './use-scheduled-message-history'
import { useScheduledOccurrenceLink } from './use-scheduled-occurrence-link'
import { useScheduledAttendanceGroupEditor } from './use-scheduled-attendance-group-editor'
import { createScheduledMessagePayload, type NewMessageDraft } from './scheduled-message-payload'
import { useScheduledMessageDrafts } from './use-scheduled-message-drafts'
import { canSendScheduledOccurrence, createScheduledMessageViewModel, editValueForOccurrence, type ScheduledMessageEditField } from './scheduled-message-view-model'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'

const empty: ScheduledSnapshot = { workspaceTimezone: DEFAULT_TIMEZONE, schedules: [], occurrences: [], memberTypes: [], groups: [], members: [] }
const frequencyItems: { value: Exclude<ScheduledFrequency, 'weekdays'>; label: string }[] = [
    { value: 'once', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
]
const typeItems = [{ value: 'announcement', label: 'Announcement' }, { value: 'attendance', label: 'Attendance' }]
const scopeItems: { value: ScheduledEditScope; label: string }[] = [{ value: 'occurrence', label: 'This message' }, { value: 'future', label: 'This and future messages' }, { value: 'series', label: 'Entire series' }]
const offsetUnitItems = [{ value: 'hours', label: 'Hours' }, { value: 'days', label: 'Days' }]
type EditField = ScheduledMessageEditField
type EditDraft = { id: string; revision: number; field: EditField; value: string; scope: ScheduledEditScope }
type Confirmation = { op: string; data: unknown; title: string; label: string; description: string }

function parseEditGroups(value: string): ScheduledAttendanceGroup[] {
    try { return JSON.parse(value) as ScheduledAttendanceGroup[] }
    catch { return [] }
}

export function useScheduledMessages() {
    const { currentWorkspaceId } = useWorkspace()
    const { toast } = useFeedback()
    const navigate = useNavigate()
    const messageDrafts = useScheduledMessageDrafts(currentWorkspaceId)
    const { draft } = messageDrafts
    const updateDraft = messageDrafts.actions.update
    const initializeDraft = messageDrafts.actions.initialize
    const resetDraft = messageDrafts.actions.reset
    const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')
    const fetcher = useCallback((workspaceId: string) => fetchScheduledMessages(workspaceId), [])
    const resource = useWorkspaceResource({ emptyValue: empty, fetcher, resource: 'scheduled-messages', workspaceId: currentWorkspaceId })
    const history = useScheduledMessageHistory(tab === 'history')
    const loadHistory = history.load
    const { data: snapshot, isInitialLoading, hasData, setData, load: reloadUpcoming } = resource
    const selectedResource = tab === 'history' ? history : resource
    const { isLoading: loading, error: resourceError } = selectedResource
    const [loadedWorkspaceId, setLoadedWorkspaceId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [editing, setEditing] = useState<ScheduledOccurrence | null>(null)
    const [details, setDetails] = useState<ScheduledOccurrence | null>(null)
    const [deleting, setDeleting] = useState<ScheduledOccurrence | null>(null)
    const [deleteScope, setDeleteScope] = useState<ScheduledEditScope>('occurrence')
    const [edit, setEdit] = useState<EditDraft>({ id: '', revision: 0, field: 'body', value: '', scope: 'occurrence' })
    const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
    const mutating = useRef<object | null>(null)
    const loadError = resourceError instanceof Error ? resourceError.message : resourceError ? 'Loading failed' : ''
    const occurrenceGroupEditor = useScheduledAttendanceGroupEditor(parseEditGroups(edit.value), setEditGroups)
    const scheduleGroupEditor = useScheduledAttendanceGroupEditor(draft.attendanceGroups, changeAttendanceGroups)
    const visibleSnapshot = loadedWorkspaceId === currentWorkspaceId ? snapshot : empty
    const occurrenceLink = useScheduledOccurrenceLink({ occurrences: visibleSnapshot.occurrences, workspaceId: currentWorkspaceId, ready: hasData && loadedWorkspaceId === currentWorkspaceId, enabled: tab === 'upcoming' })
    const selectedData = tab === 'history' ? history.data : visibleSnapshot
    const workspaceTimezone = visibleSnapshot.workspaceTimezone
    const view = createScheduledMessageViewModel(selectedData, draft, editing, occurrenceLink.occurrence ?? details, edit, deleting, frequencyItems, scopeItems, typeItems, offsetUnitItems)

    useEffect(() => {
        setLoadedWorkspaceId(null)
        setEditing(null)
        setDetails(null)
        setDeleting(null)
        setConfirmation(null)
        setError('')
        return () => { mutating.current = null }
    }, [currentWorkspaceId])

    useEffect(() => {
        if (!hasData || !currentWorkspaceId) return
        setLoadedWorkspaceId(currentWorkspaceId)
        initializeDraft(snapshot.workspaceTimezone)
    }, [currentWorkspaceId, hasData, initializeDraft, snapshot.workspaceTimezone])

    function setEditGroups(groups: ScheduledAttendanceGroup[]): void {
        setEdit(current => ({ ...current, value: JSON.stringify(groups) }))
    }

    function changeAttendanceGroups(groups: ScheduledAttendanceGroup[]): void {
        updateDraft(current => ({ ...current, attendanceGroups: groups }))
    }

    const reload = useCallback(async () => {
        if (mutating.current) return
        if (tab === 'history') await loadHistory()
        else await reloadUpcoming(true)
    }, [loadHistory, reloadUpcoming, tab])

    async function mutate(op: string, data: unknown): Promise<boolean> {
        if (!currentWorkspaceId || mutating.current) return false
        const mutation = {}
        const generation = getCurrentWorkspaceGeneration()
        function isCurrent(): boolean { return mutating.current === mutation && generation === getCurrentWorkspaceGeneration() }
        mutating.current = mutation
        setBusy(true)
        setError('')
        try {
            const next = await mutateScheduledMessage(currentWorkspaceId, op, data)
            if (!isCurrent()) return false
            setData(next)
            setLoadedWorkspaceId(currentWorkspaceId)
            if (history.hasData || tab === 'history') void history.load()
            return true
        } catch (reason) {
            if (isCurrent()) toast({ title: "Couldn't complete action", description: reason instanceof Error ? reason.message : 'Operation failed', variant: 'error' })
            return false
        } finally {
            if (mutating.current === mutation) {
                mutating.current = null
                setBusy(false)
            }
        }
    }

    function startMessage(): void {
        resetDraft(visibleSnapshot.workspaceTimezone)
        setError('')
    }

    function changeDraftType(value: string): void {
        if (value !== 'announcement' && value !== 'attendance') return
        updateDraft(current => ({ ...current, messageType: value }))
    }

    function changeDraft(event: ChangeEvent<HTMLInputElement>): void {
        const { name, value } = event.target
        updateDraft(current => ({ ...current, [name]: value }))
    }

    function changeBody(body: string): void { updateDraft(current => ({ ...current, body })) }
    function changeMemberSearch(event: ChangeEvent<HTMLInputElement>): void { updateDraft(current => ({ ...current, memberSearch: event.target.value })) }
    function changeEditBody(body: string): void { setEdit(current => ({ ...current, value: body })) }

    function setStartsOn(value: string): void { updateDraft(current => ({ ...current, startsOn: value })) }
    function setDeliveryMode(value: string): void { if (value === 'now' || value === 'scheduled') updateDraft(current => ({ ...current, sendMode: value })) }
    function setFrequency(value: string): void {
        if (!frequencyItems.some(item => item.value === value)) return
        updateDraft(current => ({ ...current, frequency: value as NewMessageDraft['frequency'], untilOn: value === 'once' ? '' : current.untilOn }))
    }
    function setFollowUpUnit(value: string): void { if (value === 'hours' || value === 'days') updateDraft(current => ({ ...current, followUpUnit: value })) }
    function changeTab(value: string): void { if (value === 'upcoming' || value === 'history') setTab(value) }

    function changeAttendee(event: ChangeEvent<HTMLInputElement>): void {
        const { value, checked } = event.currentTarget
        updateDraft(current => ({ ...current, attendeeIds: checked ? [...current.attendeeIds, value] : current.attendeeIds.filter(id => id !== value) }))
    }

    function setDestination(value: string): void {
        const destination = view.destinationItems.find(item => item.value === value)
        if (!destination) return
        updateDraft(current => ({ ...current, groupChatId: destination.groupChatId, threadId: destination.threadId === null ? '' : String(destination.threadId) }))
    }

    function requestCreate(): void {
        if (!currentWorkspaceId || loadedWorkspaceId !== currentWorkspaceId || !messageDrafts.isInitialized) return
        setError('')
        const destination = view.selectedDestination
        if (!destination) { setError('Choose an available Telegram group or topic'); return }
        let payload
        try { payload = createScheduledMessagePayload(draft, workspaceTimezone) }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Check message details'); return }
        const scheduledDescription = draft.sendMode === 'now'
            ? `${destination.label}. The primary message will be queued now${draft.messageType === 'attendance' ? `; its Attendance follow-up is due ${draft.followUpAmount} ${draft.followUpUnit} later` : ''}.`
            : `${destination.label}. ${draft.startsOn} · ${frequencyItems.find(item => item.value === draft.frequency)?.label ?? 'Does not repeat'}${draft.frequency !== 'once' && draft.untilOn ? ` through ${draft.untilOn}` : ''}${draft.messageType === 'attendance' ? ` · Attendance follow-up ${draft.followUpAmount} ${draft.followUpUnit} after each primary send` : ''}.`
        setConfirmation({ op: 'schedule.create', title: draft.sendMode === 'now' ? 'Send this message now?' : 'Schedule this message?', label: draft.sendMode === 'now' ? 'Send now' : 'Schedule message', data: payload, description: scheduledDescription })
    }

    function selectOccurrence(id: string): void {
        const occurrence = selectedData.occurrences.find(item => item.id === id)
        if (!occurrence || occurrence.legacy_closed || !['scheduled', 'sent'].includes(occurrence.state)) return
        setError('')
        setEditing(occurrence)
        setEdit({ id: occurrence.id, revision: occurrence.revision, field: 'body', value: occurrence.body, scope: 'occurrence' })
    }

    function viewHistory(id: string): void {
        const occurrence = visibleSnapshot.occurrences.find(item => item.id === id) ?? history.data.occurrences.find(item => item.id === id)
        if (occurrence) setDetails(occurrence)
    }

    function changeDetailsOpen(open: boolean): void {
        if (open) return
        setDetails(null)
        occurrenceLink.close()
    }

    function changeEditField(field: string): void {
        if (!editing || !['body', 'attendanceGroups', 'sendOn', 'followUpMinutes'].includes(field)) return
        const value = editValueForOccurrence(field as EditField, editing, selectedData)
        setEdit(current => ({ ...current, field: field as EditField, value, scope: 'occurrence' }))
    }

    function changeEditValue(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void { setEdit(current => ({ ...current, value: event.target.value })) }
    function setEditTimestamp(value: string): void { setEdit(current => ({ ...current, value })) }
    function changeScope(value: string): void { if (value === 'occurrence' || value === 'future' || value === 'series') setEdit(current => ({ ...current, scope: value })) }

    function requestEdit(): void {
        if (!editing) return
        setError('')
        let value: string = edit.value
        try {
            if (edit.field === 'body') validateScheduledBody(editing.message_type, edit.value)
            if (edit.field === 'attendanceGroups') {
                value = JSON.stringify(validateScheduledAttendanceGroups(editing.message_type, parseEditGroups(edit.value)))
            }
            if (edit.field === 'sendOn') value = scheduledTimestamp(edit.value, selectedData.schedules.find(item => item.id === editing.schedule_id)?.timezone ?? selectedData.workspaceTimezone)
            if (edit.field === 'followUpMinutes') {
                const minutes = Number(edit.value)
                if (!Number.isInteger(minutes) || minutes < 1 || minutes > 525600) throw new Error('Follow-up delay must be 1 to 525600 minutes')
                value = String(minutes)
            }
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Check the message details')
            return
        }
        const target = edit.scope === 'occurrence' ? 'this message' : edit.scope === 'future' ? 'this and future messages' : 'the entire series'
        const editLabels: Record<EditField, string> = { body: 'message body', attendanceGroups: 'attendance groups', sendOn: 'send time', followUpMinutes: 'follow-up delay' }
        const label = editLabels[edit.field]
        const followUpDescription = edit.field === 'followUpMinutes' ? ` The follow-up is anchored to the primary send time and waits for the primary to be sent if that time has passed.` : ''
        setConfirmation({ op: 'occurrence.edit', title: 'Apply this change?', label: 'Apply change', data: { id: edit.id, revision: edit.revision, field: edit.field, value, scope: edit.scope }, description: `Apply the ${label} change to ${target}? Existing attendance responses and discussion stay with this message.${followUpDescription}` })
    }

    function requestSend(id: string): void {
        const occurrence = selectedData.occurrences.find(item => item.id === id)
        if (!occurrence || !canSendScheduledOccurrence(occurrence)) return
        setError('')
        setConfirmation({ op: 'occurrence.send', title: 'Send this message now?', label: 'Send now', data: { id, revision: occurrence.revision }, description: 'This queues the scheduled message for Telegram delivery.' })
    }

    function requestResend(id: string): void {
        const occurrence = selectedData.occurrences.find(item => item.id === id)
        if (!occurrence || occurrence.state !== 'sent' || occurrence.legacy_closed) return
        setError('')
        setConfirmation({ op: 'occurrence.resend', title: 'Resend this message?', label: 'Resend', data: { id, revision: occurrence.revision }, description: 'This posts a new Telegram message using the saved content and responses. Discussion remains with the existing message.' })
    }

    function requestDelete(id: string): void {
        const occurrence = selectedData.occurrences.find(item => item.id === id)
        if (!occurrence || occurrence.state === 'sending' || busy) return
        setError('')
        setDeleteScope('occurrence')
        setDeleting(occurrence)
    }

    function changeDeleteScope(value: string): void { if (value === 'occurrence' || value === 'future' || value === 'series') setDeleteScope(value) }
    function changeDeleteOpen(open: boolean): void { if (!open && !busy) setDeleting(null) }
    function reviewDelete(): void {
        if (!deleting) return
        const target = deleteScope === 'occurrence' ? 'this message' : deleteScope === 'future' ? 'this and future messages' : 'the entire series'
        setConfirmation({ op: 'occurrence.delete', title: 'Delete message?', label: 'Delete message', data: { id: deleting.id, revision: deleting.revision, scope: deleteScope }, description: `Delete ${target}? Scheduled sends will be cancelled and Telegram cleanup will be attempted. Existing responses and discussion are retained in Console history.` })
        setDeleting(null)
    }

    function changeEditorOpen(open: boolean): void { if (!open && !busy) setEditing(null) }
    function changeConfirmationOpen(open: boolean): void { if (!open && !busy) setConfirmation(null) }

    async function confirm(): Promise<void> {
        if (!confirmation) return
        const op = confirmation.op
        if (!await mutate(op, confirmation.data)) return
        setConfirmation(null)
        setEditing(null)
        setDeleting(null)
        if (op === 'schedule.create') {
            resetDraft(visibleSnapshot.workspaceTimezone)
            setTab('upcoming')
            navigate(`/${routes.scheduledMessages}`)
        }
    }

    async function syncCommands(): Promise<void> { await mutate('commands.sync', {}) }

    return {
        state: {
            tab,
            snapshot: visibleSnapshot,
            draft,
            editing: loadedWorkspaceId === currentWorkspaceId ? editing : null,
            deleting: loadedWorkspaceId === currentWorkspaceId ? deleting : null,
            details: loadedWorkspaceId === currentWorkspaceId ? view.details : null,
            edit,
            deleteScope,
            confirmation: loadedWorkspaceId === currentWorkspaceId ? confirmation : null,
            error,
            loadError,
            loading,
            isInitialLoading: !loadError && (isInitialLoading || loadedWorkspaceId !== currentWorkspaceId || !messageDrafts.isInitialized),
            busy,
            historyLoadingMore: history.isLoadingMore,
            historyPageError: tab === 'history' && history.pageError ? (history.pageError instanceof Error ? history.pageError.message : 'Could not load older messages') : '',
        },
        actions: {
            reload,
            setTab: changeTab,
            startMessage,
            changeDraft,
            changeDraftType,
            changeBody,
            changeAttendee,
            changeMemberSearch,
            setDestination,
            setStartsOn,
            setDeliveryMode,
            setFrequency,
            setFollowUpUnit,
            requestCreate,
            loadMoreHistory: history.loadMore,
            selectOccurrence,
            viewHistory,
            changeDetailsOpen,
            changeEditField,
            changeEditValue,
            changeEditBody,
            setEditTimestamp,
            setEditGroup: occurrenceGroupEditor.change,
            addEditGroup: occurrenceGroupEditor.add,
            enableEditGroups: occurrenceGroupEditor.enable,
            clearEditGroups: occurrenceGroupEditor.clear,
            removeEditGroup: occurrenceGroupEditor.remove,
            changeScope,
            requestEdit,
            requestSend,
            requestResend,
            requestDelete,
            changeDeleteScope,
            changeDeleteOpen,
            reviewDelete,
            changeEditorOpen,
            changeConfirmationOpen,
            confirm,
            syncCommands,
            changeScheduleGroup: scheduleGroupEditor.change,
            addScheduleGroup: scheduleGroupEditor.add,
            enableScheduleGroups: scheduleGroupEditor.enable,
            removeScheduleGroup: scheduleGroupEditor.remove,
            clearScheduleGroups: scheduleGroupEditor.clear,
        },
        meta: {
            occurrences: view.occurrences,
            occurrenceLoading: selectedResource.isInitialLoading,
            hasMoreHistory: tab === 'history' && history.hasMore,
            destinationItems: view.destinationItems,
            destinationValue: view.selectedDestination?.value ?? '',
            frequencyItems,
            typeItems,
            offsetUnitItems,
            scopeItems,
            editFieldItems: view.editFieldItems,
            workspaceTimezone,
            primaryPreview: view.primaryPreview,
            followUpPreview: view.followUpPreview,
            editPreview: view.editPreview,
            editGroups: view.editGroups,
            deletingLabel: view.deletingLabel,
            editingLabel: view.editingLabel,
            isAttendance: view.isAttendance,
            isRecurring: view.isRecurring,
            members: view.members,
            selectedAttendeeCount: view.selectedAttendeeCount,
            hasMatchingMembers: view.hasMatchingMembers,
            showScope: view.showScope,
        },
    }
}
