import { workspaceId } from '@/lib/workspace'

// Fire-and-forget notify calls to this app's serverless functions, which
// HMAC-sign and forward to moc-console. Notification failures must never
// break the public submission UI.

function fire(path: string, body: Record<string, unknown>): void {
  void (async () => {
    try {
      await fetch(path, {
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
  trackingCode: string
  title: string
  requesterName: string | null
}): void {
  fire('/api/notify/booking', {
    event_type: 'booking.created',
    workspace_id: workspaceId,
    tracking_code: args.trackingCode,
    title: args.title,
    requester_name: args.requesterName,
    status: 'booked',
  })
}
