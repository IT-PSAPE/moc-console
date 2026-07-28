import { workspaceId } from '@/lib/workspace'
import { apiUrl } from '@moc/utils/api-url'

// Fire-and-forget notify calls to the MOC API app, which dispatches straight
// to the configured Telegram routes. Notification failures must never break
// the public submission UI.

function fire(path: string, body: Record<string, unknown>): void {
  void (async () => {
    try {
      await fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // swallow
    }
  })()
}

export function notifyRequestCreated(args: {
  requestId: string
  title: string
  requesterName: string | null
}): void {
  fire('/api/notify/request', {
    event_type: 'request.created',
    workspace_id: workspaceId,
    request_id: args.requestId,
    title: args.title,
    requester_name: args.requesterName,
    status: 'not_started',
  })
}

export function notifyBookingCreated(args: {
  bookingId: string
  trackingCode: string
  title: string
  requesterName: string | null
}): void {
  fire('/api/notify/booking', {
    event_type: 'booking.created',
    workspace_id: workspaceId,
    booking_id: args.bookingId,
    tracking_code: args.trackingCode,
    title: args.title,
    requester_name: args.requesterName,
    status: 'booked',
  })
}
