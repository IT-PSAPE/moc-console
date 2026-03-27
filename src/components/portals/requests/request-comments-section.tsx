import { useState, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ListSection } from '@/components/ui/list-section'
import { TextArea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/utils'
import type { RequestNote } from '@/types'

interface RequestCommentsSectionProps {
  notes: RequestNote[]
  onAddComment: (body: string) => void
}

export function RequestCommentsSection({ notes, onAddComment }: RequestCommentsSectionProps) {
  const [draft, setDraft] = useState('')

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value)
  }

  function handleSubmit() {
    const trimmedDraft = draft.trim()
    if (!trimmedDraft) return

    onAddComment(trimmedDraft)
    setDraft('')
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-text-primary">Comments</h4>
        <TextArea
          className="min-h-24"
          id="request-comment"
          onChange={handleDraftChange}
          placeholder="Add a note for the team"
          value={draft}
        />
        <div className="flex justify-end">
          <Button disabled={!draft.trim()} onClick={handleSubmit} size="sm" variant="secondary">
            Add Comment
          </Button>
        </div>
      </div>

      {notes.length > 0 ? (
        <ListSection.Root>
          <ListSection.Items>
          {notes.map((note) => (
            <ListSection.Item key={note.id}>
              <p className="text-sm text-text-primary">{note.body}</p>
              <p className="mt-2 text-xs text-text-tertiary">
                {note.author} · {formatDateTime(note.created_at)}
              </p>
            </ListSection.Item>
          ))}
          </ListSection.Items>
        </ListSection.Root>
      ) : (
        <ListSection.Root>
          <ListSection.Empty description="Use the form above to add the first comment." title="No comments yet" />
        </ListSection.Root>
      )}
    </section>
  )
}
