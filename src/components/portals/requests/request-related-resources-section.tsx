import { ListSection } from '@/components/ui/list-section'
import type { CultureRequest } from '@/types'

function ResourceList({ title, items, emptyTitle, emptyMessage }: { title: string; items: string[]; emptyTitle: string; emptyMessage: string }) {
  return (
    <ListSection.Root>
      <ListSection.Header>{title}</ListSection.Header>
      {items.length > 0 ? (
        <ListSection.Items>
          {items.map((item) => (
            <ListSection.Item key={item}>{item}</ListSection.Item>
          ))}
        </ListSection.Items>
      ) : (
        <ListSection.Empty description={emptyMessage} title={emptyTitle} />
      )}
    </ListSection.Root>
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
        title="Selected Media"
        items={mediaNames}
        emptyTitle="No media selected"
        emptyMessage="No media has been selected for this request."
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
