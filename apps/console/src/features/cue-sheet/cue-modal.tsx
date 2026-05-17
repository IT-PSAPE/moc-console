import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { Select } from '@moc/ui/components/form/select'
import { TextArea } from '@moc/ui/components/form/text-area'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Label } from '@moc/ui/components/display/text'
import { useTimeline } from '@/components/timeline'
import { CUE_TYPE_CONFIG } from '@/components/timeline'
import { CUE_TYPES } from '@moc/types/cue-sheet'
import type { Cue, CueType } from '@moc/types/cue-sheet'
import type { Track } from '@moc/types/cue-sheet'
import type { CueModalState } from '@/components/timeline/timeline-types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAssigneesByCueId, type ResolvedAssignee } from '@/data/fetch-assignees'
import { addCueAssignee } from '@/data/mutate-assignees'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { useCueSheet } from './cue-sheet-provider'
import { randomId } from '@moc/utils/random-id'
import type { User } from '@moc/types/requests'
import { getInitialForm, type CueFormState } from './cue-modal-form'
import { CreateCueAssigneeSection, EditCueAssigneeSection } from './cue-modal-assignees'

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

    function handleOpenChange(next: boolean) {
        if (!next) closeCueModal()
    }

    function handleLabelChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, label: e.target.value }))
    }

    function handleTrackChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setForm((prev) => ({ ...prev, trackId: e.target.value }))
    }

    function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setForm((prev) => ({ ...prev, type: e.target.value as CueType }))
    }

    function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, startMin: Number(e.target.value) || 0 }))
    }

    function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, durationMin: Number(e.target.value) || 1 }))
    }

    function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setForm((prev) => ({ ...prev, notes: e.target.value }))
    }

    return (
        <Modal open={true} onOpenChange={handleOpenChange}>
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
                                        onChange={handleLabelChange}
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Track" required />
                                    <Select value={form.trackId} onChange={handleTrackChange}>
                                        {tracks.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Type" required />
                                    <Select value={form.type} onChange={handleTypeChange}>
                                        {CUE_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {CUE_TYPE_CONFIG[type].label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <FormLabel label="Start (min)" required />
                                        <Input
                                            type="number"
                                            min={0}
                                            placeholder="0"
                                            value={String(form.startMin)}
                                            onChange={handleStartChange}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <FormLabel label="Duration (min)" required />
                                        <Input
                                            type="number"
                                            min={1}
                                            placeholder="5"
                                            value={String(form.durationMin)}
                                            onChange={handleDurationChange}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Notes" optional />
                                    <TextArea
                                        rows={3}
                                        placeholder="Optional notes..."
                                        value={form.notes}
                                        onChange={handleNotesChange}
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
