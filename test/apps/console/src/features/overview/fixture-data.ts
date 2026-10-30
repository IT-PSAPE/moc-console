import type { Booking } from '@moc/types/equipment/booking'
import type { Request } from '@moc/types/requests'
import type { Stream } from '@moc/types/streams/stream'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import type { VenueBooking } from '@moc/types/venues'
import type { DailyQuote } from '@moc/sdk/daily-quotes'
import type { UpcomingScheduledMessage } from '@moc/sdk/overview'

export const fixtureWorkspaceId = '11111111-1111-4111-8111-111111111111'
export const fixtureUserId = '22222222-2222-4222-8222-222222222222'
export const fixtureViewerId = '33333333-3333-4333-8333-333333333333'
const baseline = Date.now()
function instant(minutes: number): string { return new Date(baseline + minutes * 60_000).toISOString() }
function tomorrow(hour: number): string { const date = new Date(baseline); date.setDate(date.getDate() + 1); date.setHours(hour, 0, 0, 0); return date.toISOString() }

function request(id: string, title: string, dueDate: string, status: Request['status'] = 'not_started'): Request {
  return { id, title, dueDate, status, category: 'production', categoryName: 'Production', createdAt: instant(-1440), updatedAt: instant(-60), requestedBy: 'Alex', who: '', what: '', when: '', where: '', why: '', how: '' }
}
export const fixtureRequests: Request[] = [
  request('request-next', 'Prepare the Sunday production brief', instant(20)),
  request('request-tomorrow', 'Confirm the volunteer roster', tomorrow(9)),
  request('request-overdue', 'Overdue request should stay hidden', instant(-240)),
  request('request-done', 'Completed request should stay hidden', instant(90), 'completed'),
]
export const fixtureBookings: Booking[] = [{ id: 'equipment-next', title: 'Camera kit for rehearsals', trackingCode: 'EQ-FIXTURE', bookedBy: 'Morgan', checkedOutDate: instant(60), expectedReturnAt: instant(180), returnedDate: null, duration: '2 hours', status: 'booked', items: [], createdAt: instant(-1440) }]
function venue(id: string, title: string, start: string, end: string): VenueBooking {
  return { id, workspaceId: fixtureWorkspaceId, title, venueId: 'venue-main', venueName: 'Main Hall', venueDescription: null, eventId: 'event-rehearsal', eventName: 'Rehearsal', eventOther: null, trackingCode: 'VEN-FIXTURE', requestedBy: 'Taylor', status: 'approved', startsAt: start, endsAt: end, recurrence: null, occurrences: [{ index: 0, startsAt: start, endsAt: end }], cancelledAt: null, cancelledBy: null, cancelReason: null, approvedAt: instant(-1440), approvedBy: fixtureUserId, rejectedAt: null, rejectedBy: null, createdAt: instant(-1440), updatedAt: instant(-60) }
}
export const fixtureVenues: VenueBooking[] = [venue('venue-ongoing', 'Worship team rehearsal', instant(-30), instant(45)), venue('venue-past', 'Past venue booking should stay hidden', instant(-180), instant(-120)), venue('venue-tomorrow', 'Weekend planning session', tomorrow(11), tomorrow(12))]
function stream(id: string, title: string, start: string, status: Stream['streamStatus'] = 'ready'): Stream {
  return { id, workspaceId: fixtureWorkspaceId, youtubeBroadcastId: id, youtubeStreamId: id, title, description: '', thumbnailUrl: null, privacyStatus: 'unlisted', isForKids: false, scheduledStartTime: start, actualStartTime: status === 'live' ? start : null, actualEndTime: null, streamStatus: status, streamUrl: null, streamKey: null, ingestionUrl: null, categoryId: null, tags: [], latencyPreference: 'normal', enableDvr: true, enableEmbed: true, enableAutoStart: false, enableAutoStop: false, playlistId: null, createdBy: fixtureUserId, createdAt: instant(-1440), updatedAt: instant(-60) }
}
export const fixtureStreams: Stream[] = [stream('stream-live', 'Evening gathering', instant(-15), 'live'), stream('stream-next', 'Sunday service broadcast', tomorrow(10)), stream('stream-complete', 'Completed stream should stay hidden', instant(30), 'complete')]
export const fixtureMeetings: ZoomMeeting[] = [{ id: 'meeting-next', workspaceId: fixtureWorkspaceId, zoomMeetingId: 123456, topic: 'Production team check-in', description: '', meetingType: 'scheduled', startTime: tomorrow(8), duration: 30, timezone: 'Africa/Johannesburg', joinUrl: null, password: null, recurrenceType: 'none', recurrenceInterval: null, recurrenceDays: null, waitingRoom: true, muteOnEntry: true, continuousChat: false, createdBy: fixtureUserId, createdAt: instant(-1440), updatedAt: instant(-60) }]
export const fixtureMessages: UpcomingScheduledMessage[] = [{ id: 'message-next', title: 'Evening team update', scheduledFor: instant(30), status: 'scheduled' }, { id: 'message-tomorrow', title: 'Volunteer reminder', scheduledFor: tomorrow(7), status: 'scheduled' }]
export const fixtureQuotes: DailyQuote[] = [
  { id: 'quote-one', text: 'The small things we do with care become the things that matter most.', attribution: 'Fixture quote · Daily inspiration', active: true, createdAt: instant(-2880), updatedAt: instant(-1440) },
  { id: 'quote-two', text: 'Make room for what is possible, then take the next thoughtful step.', attribution: 'Fixture quote · A fresh perspective', active: true, createdAt: instant(-1440), updatedAt: instant(-60) },
  { id: 'quote-inactive', text: 'An inactive quote stays in the library.', attribution: null, active: false, createdAt: instant(-60), updatedAt: instant(-60) },
]
