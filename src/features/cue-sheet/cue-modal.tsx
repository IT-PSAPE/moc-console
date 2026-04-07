import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Label } from '@/components/display/text'
import { useTimeline } from '@/components/timeline'
import { CUE_TYPE_CONFIG } from '@/components/timeline'
import { CUE_TYPES } from '@/types/cue-sheet'
import type { CueType } from '@/types/cue-sheet'
import { useCallback, useEffect, useState } from 'react'

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

// ─── Modal ─────────────────────────────────────────────────────────

export function CueModal() {
    const { tracks, cueModal, closeCueModal, addCue, updateCue, moveCue } = useTimeline()

    const isOpen = cueModal.mode !== 'closed'
    const isEdit = cueModal.mode === 'edit'

    const [form, setForm] = useState<CueFormState>(defaultForm)

    useEffect(() => {
        if (cueModal.mode === 'create') {
            setForm({
                ...defaultForm,
                trackId: cueModal.defaultTrackId ?? tracks[0]?.id ?? '',
                startMin: cueModal.defaultStartMin ?? 0,
            })
        } else if (cueModal.mode === 'edit') {
            setForm({
                label: cueModal.cue.label,
                trackId: cueModal.trackId,
                type: cueModal.cue.type,
                startMin: cueModal.cue.startMin,
                durationMin: cueModal.cue.durationMin,
                notes: cueModal.cue.notes ?? '',
            })
        }
    }, [cueModal, tracks])

    const canSubmit = form.label.trim().length > 0 && form.trackId.length > 0 && form.durationMin > 0

    const handleSubmit = useCallback(() => {
        if (!canSubmit) return

        if (cueModal.mode === 'create') {
            addCue(form.trackId, {
                label: form.label.trim(),
                type: form.type,
                startMin: form.startMin,
                durationMin: form.durationMin,
                notes: form.notes.trim() || undefined,
            })
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
    }, [canSubmit, form, cueModal, addCue, updateCue, moveCue, closeCueModal])

    return (
        <Modal.Root open={isOpen} onOpenChange={(next) => { if (!next) closeCueModal() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="max-w-md">
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
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={handleSubmit} disabled={!canSubmit}>
                                {isEdit ? 'Save' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
