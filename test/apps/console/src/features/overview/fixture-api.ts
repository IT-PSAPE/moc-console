import type { DailyQuote, DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import type { UserPreferences } from '@moc/sdk/users'
import { fixtureBookings, fixtureMeetings, fixtureMessages, fixtureQuotes, fixtureRequests, fixtureStreams, fixtureVenues } from './fixture-data.ts'

// In-memory synthetic data only. This module never forwards requests elsewhere.
const preferences = new Map<string, UserPreferences>()
const quotes = fixtureQuotes.map((quote) => ({ ...quote }))
const overrides = new Map<string, string | null>()
const timezone = 'Africa/Johannesburg'
type FixtureOptions = { viewer: boolean; empty: boolean; fail: string | null }

function inputRecord(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : {}
}
function denied(): never { throw Object.assign(new Error('Fixture admin permission required'), { status: 403 }) }
function daily(empty: boolean): DailyQuoteSelection {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const active = empty ? [] : quotes.filter((quote) => quote.active)
  const selected = active.find((quote) => quote.id === overrides.get(date))
  const index = Math.floor(Date.now() / 86_400_000) % Math.max(1, active.length)
  return { quote: selected ?? active[index] ?? null, date, timezone, overridden: Boolean(selected) }
}
function saveQuote(input: Record<string, unknown>): DailyQuote {
  const existing = quotes.find((quote) => quote.id === input.id)
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  if (!text || text.length > 1000) throw Object.assign(new Error('Quote must contain 1 to 1000 characters'), { status: 400 })
  const attribution = typeof input.attribution === 'string' ? input.attribution.trim() || null : null
  if (attribution && attribution.length > 200) throw Object.assign(new Error('Attribution is too long'), { status: 400 })
  const now = new Date().toISOString()
  const quote = { id: existing?.id ?? `fixture-quote-${quotes.length + 1}`, text, attribution, active: typeof input.active === 'boolean' ? input.active : existing?.active ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now }
  if (existing) quotes.splice(quotes.indexOf(existing), 1, quote)
  else quotes.push(quote)
  return quote
}

export function fixtureApi(capability: string, operation: string, rawInput: unknown, options: FixtureOptions): unknown {
  if (options.fail === capability) throw Object.assign(new Error(`Synthetic ${capability} failure for verification`), { status: 503 })
  const input = inputRecord(rawInput)
  const user = options.viewer ? 'viewer' : 'admin'
  if (capability === 'users' && operation === 'getPreferences') return preferences.get(user) ?? { defaultCalendarView: 'week', overviewItemKinds: ['request', 'equipment', 'venue', 'stream', 'message'] }
  if (capability === 'users' && operation === 'updatePreferences') {
    const current = preferences.get(user) ?? { defaultCalendarView: 'week', overviewItemKinds: ['request', 'equipment', 'venue', 'stream', 'message'] }
    preferences.set(user, { ...current, ...input } as UserPreferences)
    return null
  }
  if (capability === 'dailyQuotes') {
    if (operation === 'getDaily') return daily(options.empty)
    if (options.viewer) denied()
    if (operation === 'list') return options.empty ? [] : [...quotes].sort((left, right) => Number(right.active) - Number(left.active))
    if (operation === 'save') return saveQuote(input)
    if (operation === 'setActive') {
      const quote = quotes.find((item) => item.id === input.id)
      if (!quote) throw Object.assign(new Error('Quote not found'), { status: 404 })
      quote.active = input.active === true
      quote.updatedAt = new Date().toISOString()
      return quote
    }
    if (operation === 'setToday') {
      if (input.id !== null && !quotes.some((quote) => quote.id === input.id && quote.active)) throw Object.assign(new Error('Choose an active quote'), { status: 400 })
      overrides.set(daily(false).date, typeof input.id === 'string' ? input.id : null)
      return daily(false)
    }
  }
  if (capability === 'requests') {
    if (operation === 'listCategories') return [{ id: 'category-production', key: 'production', name: 'Production', active: true }]
    if (operation === 'list') return options.empty ? [] : fixtureRequests
    if (operation === 'listArchived') return []
  }
  if (capability === 'bookings' && operation === 'list') return options.empty ? [] : fixtureBookings
  if (capability === 'venueBookings' && operation === 'list') return options.empty ? [] : fixtureVenues
  if (capability === 'venues' && operation === 'list') return [{ id: 'venue-main', name: 'Main Hall', description: null, active: true }]
  if (capability === 'venues' && operation === 'listEvents') return [{ id: 'event-rehearsal', name: 'Rehearsal', description: null, active: true }]
  if (capability === 'streams' && operation === 'list') return options.empty ? [] : fixtureStreams
  if (capability === 'streams' && operation === 'listZoomMeetings') return options.empty ? [] : fixtureMeetings
  if (capability === 'streams' && ['getYouTubeConnection', 'getZoomConnection'].includes(operation)) return null
  if (capability === 'overview' && operation === 'scheduledMessages') {
    if (options.viewer) denied()
    return options.empty ? [] : fixtureMessages
  }
  throw Object.assign(new Error(`Unsupported isolated fixture call: ${capability}.${operation}`), { status: 404 })
}
