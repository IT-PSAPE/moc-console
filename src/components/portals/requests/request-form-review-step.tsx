import { formatDate, formatLabel } from '@/lib/utils'
import type { MediaItem, Equipment, RequestVenue } from '@/types'
import type { RequestFormState } from './request-form.types'

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border-secondary py-2 last:border-b-0">
      <p className="mb-0.5 text-sm font-medium text-text-secondary">{label}</p>
      <p className="text-sm text-text-tertiary">{value || 'Not provided'}</p>
    </div>
  )
}

function formatSelection(names: string[]) {
  return names.length > 0 ? names.join(', ') : 'None selected'
}

interface RequestFormReviewStepProps {
  form: RequestFormState
  venues: RequestVenue[]
  equipment: Equipment[]
  media: MediaItem[]
}

export function RequestFormReviewStep({ form, venues, equipment, media }: RequestFormReviewStepProps) {
  const venueNames = venues.filter((item) => form.venueIds.includes(item.id)).map((item) => item.name)
  const equipmentNames = equipment.filter((item) => form.equipmentIds.includes(item.id)).map((item) => item.name)
  const mediaNames = media.filter((item) => form.mediaIds.includes(item.id)).map((item) => item.title)

  return (
    <div>
      <p className="mb-3 text-sm text-text-tertiary">Review the request details before submitting.</p>
      <div className="rounded-xl border border-border-secondary px-4">
        <ReviewRow label="Title" value={form.title} />
        <ReviewRow label="Requester Email" value={form.requester_email} />
        <ReviewRow label="Type" value={formatLabel(form.type)} />
        <ReviewRow label="Priority" value={formatLabel(form.priority)} />
        <ReviewRow label="Due Date" value={form.due_date ? formatDate(form.due_date) : ''} />
        <ReviewRow label="Who" value={form.who} />
        <ReviewRow label="What" value={form.what} />
        <ReviewRow label="When" value={form.when} />
        <ReviewRow label="Where" value={form.where} />
        <ReviewRow label="Why" value={form.why} />
        <ReviewRow label="How" value={form.how} />
        <ReviewRow label="Additional Info" value={form.info} />
        <ReviewRow label="Venues" value={formatSelection(venueNames)} />
        <ReviewRow label="Equipment" value={formatSelection(equipmentNames)} />
        <ReviewRow label="Media Assets" value={formatSelection(mediaNames)} />
      </div>
    </div>
  )
}
