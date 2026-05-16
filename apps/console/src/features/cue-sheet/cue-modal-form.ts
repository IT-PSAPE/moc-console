import type { CueType } from '@moc/types/cue-sheet'
import type { Track } from '@moc/types/cue-sheet'
import type { CueModalState } from '@/components/timeline/timeline-types'

// ─── Form State ────────────────────────────────────────────────────

export type CueFormState = {
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

export function getInitialForm(cueModal: CueModalState, tracks: Track[]): CueFormState {
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
