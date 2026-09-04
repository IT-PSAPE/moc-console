export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
}

// timeZone is optional so existing callers keep rendering in the visitor's
// zone. Venue times always pass the venue's zone: a booked window has to read
// the same on every device, whatever the device thinks the time is.
export function formatDateTime(dateStr: string, timeZone?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone })
}

export function formatTime(dateStr: string, timeZone?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone })
}

// A calendar day chosen on DateSlotPicker is a plain browser-local Date (no
// time component). These convert it to/from the 'YYYY-MM-DD' key the venue
// availability RPCs expect, without going through any time zone conversion —
// the picker's day IS the day being booked.
export function formatCalendarDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseCalendarDateKey(value: string): Date | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function isPastCalendarDay(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return compareDate.getTime() < today.getTime()
}
