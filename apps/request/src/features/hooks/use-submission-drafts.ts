import { useCallback, useState } from 'react'
import { clearSubmissionDraft, loadSubmissionDraft } from '@/data/submission-draft-storage'
import { routes } from '@/screens/console-routes'
import type { SubmissionDraftKind } from '@/data/submission-draft-storage'

export type SubmissionDraftSummary = {
  kind: SubmissionDraftKind
  title: string
  description: string
  route: string
}

const submissionDrafts: SubmissionDraftSummary[] = [
  { kind: 'request', title: 'Request draft', description: 'Continue your unfinished request.', route: routes.publicRequest },
  { kind: 'booking', title: 'Equipment booking draft', description: 'Continue your unfinished equipment booking.', route: routes.publicBooking },
  { kind: 'venue', title: 'Venue booking draft', description: 'Continue your unfinished venue booking.', route: routes.publicVenue },
]

function getAvailableDrafts(): SubmissionDraftSummary[] {
  return submissionDrafts.filter((draft) => loadSubmissionDraft(draft.kind) !== null)
}

export function useSubmissionDrafts() {
  const [drafts, setDrafts] = useState<SubmissionDraftSummary[]>(getAvailableDrafts)
  const [discardKind, setDiscardKind] = useState<SubmissionDraftKind | null>(null)

  const requestDiscard = useCallback((kind: SubmissionDraftKind) => {
    setDiscardKind(kind)
  }, [])

  const setDiscardOpen = useCallback((open: boolean) => {
    if (!open) setDiscardKind(null)
  }, [])

  const confirmDiscard = useCallback(() => {
    if (!discardKind) return

    clearSubmissionDraft(discardKind)
    setDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.kind !== discardKind))
    setDiscardKind(null)
  }, [discardKind])

  return {
    state: { drafts, isDiscardOpen: discardKind !== null },
    actions: { requestDiscard, setDiscardOpen, confirmDiscard },
  }
}
