const OFFSET_DATE_TIME = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

export function isOffsetDateTime(value: string): boolean {
  const match = OFFSET_DATE_TIME.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const date = new Date(`${match[1]}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === match[1]
}
