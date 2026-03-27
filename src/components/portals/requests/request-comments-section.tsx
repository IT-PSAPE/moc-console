import { formatDateTime } from '@/lib/utils'
import type { RequestNote } from '@/types'

interface RequestCommentsSectionProps {
  notes: RequestNote[]
  onAddComment: (body: string) => void
}

export function RequestCommentsSection({ notes }: RequestCommentsSectionProps) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-text-primary">Comments</h4>
      {notes.length > 0 ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border-secondary bg-background-secondary px-3 py-3">
              <p className="text-sm text-text-primary">{note.body}</p>
              <p className="mt-2 text-xs text-text-tertiary">
                {note.author} · {formatDateTime(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border-secondary bg-background-secondary px-4 py-3">
          <p className="text-sm font-medium text-text-primary">No comments yet</p>
          <p className="text-xs text-text-tertiary">Use the pencil icon at the top to add a comment.</p>
        </div>
      )}
    </section>
  )
}
