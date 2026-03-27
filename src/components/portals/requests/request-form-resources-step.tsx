import type { MediaItem, Equipment, RequestVenue } from '@/types'
import { RequestResourceSection } from './request-resource-section'
import type { RequestFormState } from './request-form.types'

function getVenueId(venue: RequestVenue) {
  return venue.id
}

function getVenueTitle(venue: RequestVenue) {
  return venue.name
}

function getVenueDescription(venue: RequestVenue) {
  return venue.description
}

function getVenueMeta(venue: RequestVenue) {
  return venue.available ? 'Available' : 'Currently unavailable'
}

function isVenueDisabled(venue: RequestVenue) {
  return !venue.available
}

function getEquipmentId(item: Equipment) {
  return item.id
}

function getEquipmentTitle(item: Equipment) {
  return item.name
}

function getEquipmentDescription(item: Equipment) {
  return `${item.category} · ${item.location}`
}

function getEquipmentMeta(item: Equipment) {
  return `${item.status.replace(/_/g, ' ')} · ${item.condition}`
}

function isEquipmentDisabled(item: Equipment) {
  return item.status !== 'available'
}

function getMediaId(item: MediaItem) {
  return item.id
}

function getMediaTitle(item: MediaItem) {
  return item.title
}

function getMediaDescription(item: MediaItem) {
  return `Media type: ${item.type}`
}

interface RequestFormResourcesStepProps {
  form: RequestFormState
  venues: RequestVenue[]
  equipment: Equipment[]
  media: MediaItem[]
  onToggleVenue: (id: string) => void
  onToggleEquipment: (id: string) => void
  onToggleMedia: (id: string) => void
}

export function RequestFormResourcesStep({ form, venues, equipment, media, onToggleVenue, onToggleEquipment, onToggleMedia }: RequestFormResourcesStepProps) {
  return (
    <div className="space-y-6">
      <RequestResourceSection
        title="Venues"
        description="Attach a venue when the request needs space, access planning, or booking coordination."
        items={venues}
        selectedIds={form.venueIds}
        emptyMessage="No venue options are available."
        onToggle={onToggleVenue}
        getId={getVenueId}
        getTitle={getVenueTitle}
        getDescription={getVenueDescription}
        getMeta={getVenueMeta}
        isDisabled={isVenueDisabled}
      />
      <RequestResourceSection
        title="Equipment"
        description="Attach equipment that should travel with the request."
        items={equipment}
        selectedIds={form.equipmentIds}
        emptyMessage="No equipment is available."
        onToggle={onToggleEquipment}
        getId={getEquipmentId}
        getTitle={getEquipmentTitle}
        getDescription={getEquipmentDescription}
        getMeta={getEquipmentMeta}
        isDisabled={isEquipmentDisabled}
      />
      <RequestResourceSection
        title="Media Assets"
        description="Attach reference media or deliverables that belong to this request."
        items={media}
        selectedIds={form.mediaIds}
        emptyMessage="No media assets are available."
        onToggle={onToggleMedia}
        getId={getMediaId}
        getTitle={getMediaTitle}
        getDescription={getMediaDescription}
      />
    </div>
  )
}
