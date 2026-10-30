import type { OverviewItemKind } from '@moc/sdk/users'

export const overviewItemOptions: { value: OverviewItemKind; label: string }[] = [
  { value: 'request', label: 'Requests' },
  { value: 'equipment', label: 'Equipment bookings' },
  { value: 'venue', label: 'Venue bookings' },
  { value: 'stream', label: 'Streams and meetings' },
  { value: 'message', label: 'Scheduled messages' },
]
export const defaultOverviewItemKinds = overviewItemOptions.map((option) => option.value)

export function isOverviewItemKind(value: string): value is OverviewItemKind {
  return overviewItemOptions.some((option) => option.value === value)
}

export function normalizeOverviewItemKinds(values: readonly string[]): OverviewItemKind[] {
  return defaultOverviewItemKinds.filter((kind) => values.includes(kind))
}

export function equalOverviewItemKinds(left: readonly OverviewItemKind[], right: readonly OverviewItemKind[]): boolean {
  return left.length === right.length && left.every((kind) => right.includes(kind))
}
