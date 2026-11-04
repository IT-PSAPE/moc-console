type BookingNotesData = {
  notes: string | null
  requestedEquipment: string[]
  otherEquipment: string
}

function buildEquipmentSummary({ requestedEquipment, otherEquipment }: BookingNotesData): string {
  // The booking API sorts and deduplicates preset labels before storing them.
  // Keep the summary stable so it can be separated from notes when editing.
  const presets = [...new Set(requestedEquipment.map((label) => label.trim()).filter(Boolean))].sort()
  const other = otherEquipment.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const items = [...presets, ...other].map((label) => `- ${label}`)
  return items.length > 0 ? ['Equipment booked:', ...items].join('\n') : ''
}

export function buildBookingNotes(data: BookingNotesData): string {
  return [data.notes?.trim(), buildEquipmentSummary(data)].filter(Boolean).join('\n\n')
}

export function getBookingUserNotes(data: BookingNotesData): string {
  const notes = data.notes ?? ''
  const summary = buildEquipmentSummary(data)
  if (!summary) return notes
  if (notes === summary) return ''

  const suffix = `\n\n${summary}`
  return notes.endsWith(suffix) ? notes.slice(0, -suffix.length) : notes
}
