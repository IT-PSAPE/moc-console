import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { UpcomingScheduledMessage } from '@moc/sdk/overview'
import type { Venue, VenueEvent } from '@moc/types/venues'
import { useCurrentTime } from '@moc/ui/hooks/use-current-time'
import { getBrowserTimeZone } from '@moc/utils/browser-date-time'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { fetchVenues } from '@/data/fetch-venues'
import { fetchVenueEvents } from '@/data/fetch-venue-events'
import { useRequests } from '../requests/request-provider'
import { useEquipment } from '../equipment/equipment-provider'
import { useVenueBookings } from '../venues/venue-bookings-provider'
import { useStreams } from '../streams/streams-provider'
import { useUserPreferences } from '../preferences/user-preferences-provider'
import { defaultOverviewItemKinds, normalizeOverviewItemKinds, overviewItemOptions } from '../preferences/overview-item-options'
import { getOverviewAgendaGroups } from './overview-agenda'
import { getOverviewFilterKinds, updateOverviewFilterQuery } from './overview-filter-query'
import { getOverviewDateLabel, getOverviewGreeting } from './overview-presentation'
import { fetchUpcomingMessages } from './overview-service'
import { useOverviewQuote } from './use-overview-quote'

const emptyVenues: Venue[] = []
const emptyEvents: VenueEvent[] = []
const emptyMessages: UpcomingScheduledMessage[] = []

export function useOverview() {
  const { user, profile } = useAuth()
  const { currentWorkspaceId, role } = useWorkspace()
  const { state: preferences, actions: { retry: retryPreferences } } = useUserPreferences()
  const now = useCurrentTime()
  const quote = useOverviewQuote(currentWorkspaceId, now)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null)
  const scope = `${user?.id ?? 'none'}:${currentWorkspaceId ?? 'none'}`
  const canReadMessages = role?.can_update === true
  const allowedKinds = useMemo(() => defaultOverviewItemKinds.filter((kind) => kind !== 'message' || canReadMessages), [canReadMessages])
  const { kinds, overridden } = useMemo(() => getOverviewFilterKinds(searchParams, scope, preferences.overviewItemKinds, allowedKinds), [searchParams, scope, preferences.overviewItemKinds, allowedKinds])
  const ready = !preferences.isLoading
  const showRequests = ready && kinds.includes('request')
  const showEquipment = ready && kinds.includes('equipment')
  const showVenues = ready && kinds.includes('venue')
  const showStreams = ready && kinds.includes('stream')
  const showMessages = ready && kinds.includes('message')
  const requests = useRequests()
  const equipment = useEquipment()
  const venues = useVenueBookings()
  const streams = useStreams()
  const { loadActiveRequests, retryActiveRequests } = requests.actions
  const { loadBookings, retryBookings } = equipment.actions
  const { loadBookings: loadVenueBookings, retryBookings: retryVenueBookings } = venues.actions
  const { loadStreams, loadZoomMeetings, retryStreams, retryZoomMeetings } = streams.actions
  const venueOptions = useWorkspaceResource({ workspaceId: currentWorkspaceId, resource: 'venues', fetcher: fetchVenues, emptyValue: emptyVenues, enabled: showVenues })
  const eventOptions = useWorkspaceResource({ workspaceId: currentWorkspaceId, resource: 'venue-events', fetcher: fetchVenueEvents, emptyValue: emptyEvents, enabled: showVenues })
  const messages = useWorkspaceResource({ workspaceId: currentWorkspaceId, resource: 'overview-messages', fetcher: fetchUpcomingMessages, emptyValue: emptyMessages, enabled: showMessages })
  useEffect(() => { if (showRequests) void loadActiveRequests() }, [showRequests, loadActiveRequests])
  useEffect(() => { if (showEquipment) void loadBookings() }, [showEquipment, loadBookings])
  useEffect(() => { if (showVenues) void loadVenueBookings() }, [showVenues, loadVenueBookings])
  useEffect(() => {
    if (showStreams) { void loadStreams(); void loadZoomMeetings() }
  }, [showStreams, loadStreams, loadZoomMeetings])
  const groups = useMemo(() => getOverviewAgendaGroups({
    work: { requests: showRequests ? requests.state.activeRequests : [], bookings: showEquipment ? equipment.state.bookings : [], venueBookings: showVenues ? venues.state.bookings : [] },
    streams: showStreams ? streams.state.streams : [], meetings: showStreams ? streams.state.zoomMeetings : [], messages: messages.data,
    kinds, now, timezone: getBrowserTimeZone(),
    options: {
      categories: requests.state.requestCategories.map((category) => ({ value: category.key, label: category.name })),
      venues: venueOptions.data.map((venue) => ({ value: venue.id, label: venue.name })),
      venueEvents: eventOptions.data.map((event) => ({ value: event.id, label: event.name })),
    },
  }), [showRequests, requests.state.activeRequests, requests.state.requestCategories, showEquipment, equipment.state.bookings, showVenues, venues.state.bookings, showStreams, streams.state.streams, streams.state.zoomMeetings, messages.data, kinds, now, venueOptions.data, eventOptions.data])
  const loading = preferences.isLoading || (showRequests && requests.state.isInitialLoadingActive) || (showEquipment && equipment.state.isInitialLoadingBookings) || (showVenues && venues.state.isInitialLoading) || (showStreams && (streams.state.isInitialLoadingStreams || streams.state.isInitialLoadingZoomMeetings)) || messages.isInitialLoading
  const error = preferences.error ?? (showRequests ? requests.state.activeError : null) ?? (showEquipment ? equipment.state.bookingsError : null) ?? (showVenues ? venues.state.error : null) ?? (showStreams ? streams.state.streamsError ?? streams.state.zoomMeetingsError : null) ?? (showMessages ? messages.error : null)
  const loadMessages = messages.load
  const retryAgenda = useCallback(() => {
    if (preferences.error) void retryPreferences()
    if (showRequests) void retryActiveRequests()
    if (showEquipment) void retryBookings()
    if (showVenues) void retryVenueBookings()
    if (showStreams) { void retryStreams(); void retryZoomMeetings() }
    if (showMessages) void loadMessages(true)
  }, [preferences.error, retryPreferences, showRequests, retryActiveRequests, showEquipment, retryBookings, showVenues, retryVenueBookings, showStreams, retryStreams, retryZoomMeetings, showMessages, loadMessages])
  function changeKinds(values: string[]): void {
    const next = normalizeOverviewItemKinds(values).filter((kind) => allowedKinds.includes(kind))
    setSearchParams(updateOverviewFilterQuery(searchParams, scope, next), { replace: true })
  }
  function resetKinds(): void { setSearchParams(updateOverviewFilterQuery(searchParams, scope, null), { replace: true }) }
  function openFilters(): void { setFiltersOpen(true) }
  const filterOptions = overviewItemOptions.filter((option) => allowedKinds.includes(option.value))
  return {
    state: { groups, kinds, filtersOpen, overridden, loading, error, emptyTitle: kinds.length === 0 ? 'Choose what you want to see' : 'Nothing coming up', quoteError: quote.error, quoteLoading: quote.isLoading, quoteText: quote.quote?.text ?? null, attribution: quote.quote?.attribution, greeting: getOverviewGreeting(profile?.name, now), dateLabel: getOverviewDateLabel(now), filtersDisabled: preferences.isLoading },
    actions: { changeKinds, resetKinds, setFiltersOpen, openFilters, retryAgenda, retryQuote: quote.retry },
    meta: { filterOptions, filterTriggerRef },
  }
}
