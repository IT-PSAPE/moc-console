import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { useTimeline } from '@moc/ui/components/timeline'
import { CUE_TYPE_CONFIG } from '@moc/ui/components/timeline'
import { CUE_TYPES } from '@moc/types/cue-sheet'
import type { Cue, CueType } from '@moc/types/cue-sheet'
import type { Track } from '@moc/types/cue-sheet'
import type { CueModalState } from '@moc/ui/components/timeline/timeline-types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MemberSearchPicker } from '@/features/assignees/member-search-picker'
import { fetchAssigneesByCueId, type ResolvedAssignee } from '@moc/data/fetch-assignees'
import { addCueAssignee, removeCueAssignee } from '@moc/data/mutate-assignees'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { useCueSheet } from './cue-sheet-provider'
import { randomId } from '@moc/utils/random-id'
import type { User } from '@moc/types/requests'

// ─── Form State ────────────────────────────────────────────────────

type CueFormState = {
    label: string
    trackId: string
    type: CueType
    startMin: number
    durationMin: number
    notes: string
}

const defaultForm: CueFormState = {
    label: '',
    trackId: '',
    type: 'performance',
    startMin: 0,
    durationMin: 5,
    notes: '',
}

function getInitialForm(cueModal: CueModalState, tracks: Track[]): CueFormState {
    if (cueModal.mode === 'create') {
        return {
            ...defaultForm,
            trackId: cueModal.defaultTrackId ?? tracks[0]?.id ?? '',
            startMin: cueModal.defaultStartMin ?? 0,
        }
    }

    if (cueModal.mode === 'edit') {
        return {
            label: cueModal.cue.label,
            trackId: cueModal.trackId,
            type: cueModal.cue.type,
            startMin: cueModal.cue.startMin,
            durationMin: cueModal.cue.durationMin,
            notes: cueModal.cue.notes ?? '',
        }
    }

    return defaultForm
}

// ─── Modal ─────────────────────────────────────────────────────────

type CueModalProps = {
    /**
     * The event id, when assignment is enabled. Required when `assignmentEnabled`
     * is true so we can sync tracks to DB before writing cue assignees.
     */
    eventId?: string
    /** Show the assignee picker. Should only be true for instance events. */
    assignmentEnabled?: boolean
}

export function CueModal({ eventId, assignmentEnabled = false }: CueModalProps = {}) {
    const { tracks, cueModal, closeCueModal, addCue, updateCue, moveCue } = useTimeline()

    const isOpen = cueModal.mode !== 'closed'
    const isEdit = cueModal.mode === 'edit'
    const formKey = useMemo(() => {
        if (cueModal.mode === 'edit') {
            return `edit-${cueModal.cue.id}-${cueModal.trackId}`
        }

        if (cueModal.mode === 'create') {
            return `create-${cueModal.defaultTrackId ?? tracks[0]?.id ?? ''}-${cueModal.defaultStartMin ?? 0}`
        }

        return 'closed'
    }, [cueModal, tracks])

    if (!isOpen) {
        return (
            <Modal open={false} onOpenChange={closeCueModal}>
                <Modal.Portal>
                    <Modal.Backdrop />
                </Modal.Portal>
            </Modal>
        )
    }

    return (
        <CueModalContent
            key={formKey}
            addCue={addCue}
            closeCueModal={closeCueModal}
            cueModal={cueModal}
            isEdit={isEdit}
            moveCue={moveCue}
            tracks={tracks}
            updateCue={updateCue}
            eventId={eventId}
            assignmentEnabled={assignmentEnabled}
        />
    )
}

type CueModalContentProps = {
    addCue: ReturnType<typeof useTimeline>['addCue']
    closeCueModal: ReturnType<typeof useTimeline>['closeCueModal']
    cueModal: CueModalState
    isEdit: boolean
    moveCue: ReturnType<typeof useTimeline>['moveCue']
    tracks: Track[]
    updateCue: ReturnType<typeof useTimeline>['updateCue']
    eventId?: string
    assignmentEnabled: boolean
}

function CueModalContent({ addCue, closeCueModal, cueModal, isEdit, moveCue, tracks, updateCue, eventId, assignmentEnabled }: CueModalContentProps) {
    const { toast } = useFeedback()
    const { actions: { syncTracks } } = useCueSheet()
    const [form, setForm] = useState<CueFormState>(() => getInitialForm(cueModal, tracks))
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Edit-mode assignees: loaded from DB, mutated directly.
    const [editAssignees, setEditAssignees] = useState<ResolvedAssignee[]>([])
    const [isLoadingAssignees, setIsLoadingAssignees] = useState(assignmentEnabled && cueModal.mode === 'edit')

    // Create-mode assignees: buffered until the cue is saved.
    const [pendingAssignees, setPendingAssignees] = useState<User[]>([])

    const isCueAssignmentEnabled = assignmentEnabled && Boolean(eventId)
    const editCueId = cueModal.mode === 'edit' ? cueModal.cue.id : null

    useEffect(() => {
        if (!isCueAssignmentEnabled || !editCueId) return
        let active = true
        fetchAssigneesByCueId(editCueId)
            .then((next) => { if (active) setEditAssignees(next) })
            .catch((error) => {
                if (active) toast({ title: 'Failed to load assignees', description: getErrorMessage(error, 'Could not load cue assignees.'), variant: 'error' })
            })
            .finally(() => { if (active) setIsLoadingAssignees(false) })
        return () => { active = false }
    }, [editCueId, isCueAssignmentEnabled, toast])

    const canSubmit = form.label.trim().length > 0 && form.trackId.length > 0 && form.durationMin > 0 && !isSubmitting

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return

        if (cueModal.mode === 'create') {
            // When assignment is enabled and we have buffered assignees, do a manual
            // sync so we can write assignee rows after the cue exists in DB.
            if (isCueAssignmentEnabled && eventId && pendingAssignees.length > 0) {
                setIsSubmitting(true)
                try {
                    const newCueId = randomId()
                    const newCue: Cue = {
                        id: newCueId,
                        label: form.label.trim(),
                        type: form.type,
                        startMin: form.startMin,
                        durationMin: form.durationMin,
                        notes: form.notes.trim() || undefined,
                    }
                    const nextTracks = tracks.map((t) =>
                        t.id === form.trackId ? { ...t, cues: [...t.cues, newCue] } : t,
                    )
                    await syncTracks(eventId, nextTracks)
                    await Promise.all(
                        pendingAssignees.map((user) => addCueAssignee(newCueId, user.id, '')),
                    )
                } catch (error) {
                    toast({ title: 'Failed to create cue', description: getErrorMessage(error, 'The cue could not be created.'), variant: 'error' })
                    setIsSubmitting(false)
                    return
                }
            } else {
                addCue(form.trackId, {
                    label: form.label.trim(),
                    type: form.type,
                    startMin: form.startMin,
                    durationMin: form.durationMin,
                    notes: form.notes.trim() || undefined,
                })
            }
        } else if (cueModal.mode === 'edit') {
            const origTrackId = cueModal.trackId
            const cueId = cueModal.cue.id

            if (form.trackId !== origTrackId) {
                moveCue(cueId, form.trackId, form.startMin)
                updateCue(form.trackId, cueId, {
                    label: form.label.trim(),
                    type: form.type,
                    durationMin: form.durationMin,
                    notes: form.notes.trim() || undefined,
                })
            } else {
                updateCue(origTrackId, cueId, {
                    label: form.label.trim(),
                    type: form.type,
                    startMin: form.startMin,
                    durationMin: form.durationMin,
                    notes: form.notes.trim() || undefined,
                })
            }
        }

        closeCueModal()
    }, [canSubmit, form, cueModal, addCue, updateCue, moveCue, closeCueModal, isCueAssignmentEnabled, eventId, pendingAssignees, tracks, syncTracks, toast])

    return (
        <Modal open={true} onOpenChange={(next) => { if (!next) closeCueModal() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-md">
                        <Modal.Header>
                            <Label.md>{isEdit ? 'Edit Cue' : 'New Cue'}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input
                                        placeholder="Cue name"
                                        value={form.label}
                                        onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Track" required />
                                    <select
                                        className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-3 focus:ring-border-brand/10"
                                        value={form.trackId}
                                        onChange={(e) => setForm((prev) => ({ ...prev, trackId: e.target.value }))}
                                    >
                                        {tracks.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Type" required />
                                    <select
                                        className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-3 focus:ring-border-brand/10"
                                        value={form.type}
                                        onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as CueType }))}
                                    >
                                        {CUE_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {CUE_TYPE_CONFIG[type].label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <FormLabel label="Start (min)" required />
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="0"
                                            value={String(form.startMin)}
                                            onChange={(e) => setForm((prev) => ({ ...prev, startMin: Number(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <FormLabel label="Duration (min)" required />
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="5"
                                            value={String(form.durationMin)}
                                            onChange={(e) => setForm((prev) => ({ ...prev, durationMin: Number(e.target.value) || 1 }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Notes" optional />
                                    <textarea
                                        className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-3 focus:ring-border-brand/10 resize-none"
                                        rows={3}
                                        placeholder="Optional notes..."
                                        value={form.notes}
                                        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                                    />
                                </div>

                                {isCueAssignmentEnabled && (
                                    <div className="flex flex-col gap-1.5">
                                        <Label.sm>Assignees</Label.sm>
                                        {cueModal.mode === 'edit' && editCueId ? (
                                            <EditCueAssigneeSection
                                                cueId={editCueId}
                                                assignees={editAssignees}
                                                isLoading={isLoadingAssignees}
                                                onChange={setEditAssignees}
                                            />
                                        ) : cueModal.mode === 'create' ? (
                                            <CreateCueAssigneeSection
                                                pending={pendingAssignees}
                                                onChange={setPendingAssignees}
                                            />
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary" disabled={isSubmitting}>Cancel</Button>
                            </Modal.Close>
                            <Button onClick={handleSubmit} disabled={!canSubmit}>
                                {isSubmitting ? 'Saving...' : isEdit ? 'Save' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}

// ─── Assignee sections ─────────────────────────────────────────────

type EditSectionProps = {
    cueId: string
    assignees: ResolvedAssignee[]
    isLoading: boolean
    onChange: (next: ResolvedAssignee[]) => void
}

function EditCueAssigneeSection({ cueId, assignees, isLoading, onChange }: EditSectionProps) {
    const { toast } = useFeedback()

    const handleAdd = useCallback(async (user: User) => {
        try {
            await addCueAssignee(cueId, user.id, '')
            onChange(await fetchAssigneesByCueId(cueId))
        } catch (error) {
            toast({ title: 'Failed to add assignee', description: getErrorMessage(error, 'Could not add cue assignee.'), variant: 'error' })
        }
    }, [cueId, onChange, toast])

    const handleRemove = useCallback(async (userId: string) => {
        try {
            await removeCueAssignee(cueId, userId)
            onChange(await fetchAssigneesByCueId(cueId))
        } catch (error) {
            toast({ title: 'Failed to remove assignee', description: getErrorMessage(error, 'Could not remove cue assignee.'), variant: 'error' })
        }
    }, [cueId, onChange, toast])

    if (isLoading) {
        return <Paragraph.xs className="text-quaternary">Loading…</Paragraph.xs>
    }

    return (
        <MemberSearchPicker
            assignees={assignees}
            onAdd={handleAdd}
            onRemove={handleRemove}
        />
    )
}

type CreateSectionProps = {
    pending: User[]
    onChange: (next: User[]) => void
}

function CreateCueAssigneeSection({ pending, onChange }: CreateSectionProps) {
    const handleAdd = useCallback((user: User) => {
        onChange([...pending, user])
    }, [onChange, pending])

    const handleRemove = useCallback((userId: string) => {
        onChange(pending.filter((u) => u.id !== userId))
    }, [onChange, pending])

    const pendingAsAssignees: ResolvedAssignee[] = pending.map((user) => ({
        ...user,
        duty: '',
    }))

    return (
        <MemberSearchPicker
            assignees={pendingAsAssignees}
            onAdd={handleAdd}
            onRemove={handleRemove}
        />
    )
}
