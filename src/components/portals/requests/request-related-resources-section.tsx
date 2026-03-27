import type { CultureRequest } from '@/types'

function ResourceList({ title, items, emptyTitle, emptyMessage }: { title: string; items: string[]; emptyTitle: string; emptyMessage: string }) {
  return (
    <section className="space-y-2">
      <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      {items.length > 0 ? (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item} className="rounded-lg border border-border-secondary bg-background-secondary px-3 py-2 text-sm text-text-primary">
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border-secondary bg-background-secondary px-4 py-3">
          <p className="text-sm font-medium text-text-primary">{emptyTitle}</p>
          <p className="text-xs text-text-tertiary">{emptyMessage}</p>
        </div>
      )}
    </section>
  )
}

interface RequestRelatedResourcesSectionProps {
  request: CultureRequest
}

export function RequestRelatedResourcesSection({ request }: RequestRelatedResourcesSectionProps) {
  const venueNames = (request.venues ?? []).map((venue) => venue.name)
  const equipmentNames = (request.equipment ?? []).map((item) => item.name)
  const mediaNames = (request.media ?? []).map((item) => item.title)

  return (
    <div className="space-y-6">
      <ResourceList
        title="Available Venues"
        items={venueNames}
        emptyTitle="No venues selected"
        emptyMessage="No venues have been selected for this request."
      />

      <ResourceList
        title="Selected Equipment"
        items={equipmentNames}
        emptyTitle="No equipment selected"
        emptyMessage="No equipment has been selected for this request."
      />

      <ResourceList
        title="Songs"
        items={mediaNames}
        emptyTitle="No songs selected"
        emptyMessage="No songs have been selected for this request."
      />

      <ResourceList
        title="Event Flow"
        items={[]}
        emptyTitle="No flow steps defined"
        emptyMessage="No event flow has been specified for this request."
      />
    </div>
  )
}
