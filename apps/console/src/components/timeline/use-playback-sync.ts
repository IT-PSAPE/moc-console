import { supabase } from '@/lib/supabase'
import { upsertEventPlaybackState } from '@/data/event-shares'
import { randomId } from '@/utils/random-id'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PlaybackSyncRole = 'controller' | 'follower'

export type PlaybackSyncOptions = {
    /** When provided, opt into the realtime broadcast channel for this event. */
    eventId: string | null | undefined
    role: PlaybackSyncRole
    isPlaying: boolean
    currentTimeMinutes: number
    /** Apply remote state (called on inbound broadcasts; followers should always honor). */
    applyRemoteState: (next: { isPlaying: boolean; currentTimeMinutes: number }) => void
    /** Persist controller state to the DB so late joiners see the latest playhead. */
    persistToDatabase?: boolean
}

type BroadcastPayload = {
    senderId: string
    isPlaying: boolean
    currentTimeMinutes: number
    sentAt: number
}

const BROADCAST_EVENT = 'state'
const PERSIST_DEBOUNCE_MS = 750
const BROADCAST_THROTTLE_MS = 200

function channelName(eventId: string) {
    return `event-playback:${eventId}`
}

/**
 * Wires a Supabase Realtime broadcast channel to Timeline playback state.
 *
 * Controllers broadcast their local state changes to all subscribers and
 * persist a debounced snapshot to `event_playback_state` so late joiners
 * can fetch the latest playhead. Followers ignore their local ticker
 * (suppressed at the playback hook layer) and apply remote updates.
 */
export function usePlaybackSync({ eventId, role, isPlaying, currentTimeMinutes, applyRemoteState, persistToDatabase }: PlaybackSyncOptions) {
    // Stable per-mount sender id used to filter out our own broadcasts.
    const [senderId] = useState(() => randomId())

    const channelRef = useRef<RealtimeChannel | null>(null)
    const lastBroadcastAtRef = useRef(0)
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const applyRemoteStateRef = useRef(applyRemoteState)
    useEffect(() => {
        applyRemoteStateRef.current = applyRemoteState
    }, [applyRemoteState])

    // Subscribe once per eventId
    useEffect(() => {
        if (!eventId) return

        const channel = supabase.channel(channelName(eventId), {
            config: { broadcast: { self: false } },
        })

        channel.on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
            const data = payload as BroadcastPayload
            if (!data || data.senderId === senderId) return
            applyRemoteStateRef.current({
                isPlaying: data.isPlaying,
                currentTimeMinutes: data.currentTimeMinutes,
            })
        })

        channel.subscribe()
        channelRef.current = channel

        return () => {
            channel.unsubscribe()
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [eventId, senderId])

    // Outbound: controllers broadcast on local state changes
    useEffect(() => {
        if (!eventId || role !== 'controller') return
        const channel = channelRef.current
        if (!channel) return

        const now = performance.now()
        if (now - lastBroadcastAtRef.current < BROADCAST_THROTTLE_MS) return
        lastBroadcastAtRef.current = now

        channel.send({
            type: 'broadcast',
            event: BROADCAST_EVENT,
            payload: {
                senderId: senderId,
                isPlaying,
                currentTimeMinutes,
                sentAt: Date.now(),
            } satisfies BroadcastPayload,
        })
    }, [eventId, role, isPlaying, currentTimeMinutes, senderId])

    // Persist controller state (debounced) so late joiners catch up
    useEffect(() => {
        if (!eventId || role !== 'controller' || !persistToDatabase) return

        if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
        persistTimerRef.current = setTimeout(() => {
            upsertEventPlaybackState(eventId, {
                currentTimeMin: currentTimeMinutes,
                isPlaying,
            }).catch((error) => {
                // Non-fatal — local playback continues even if persistence fails
                console.warn('Failed to persist playback state', error)
            })
        }, PERSIST_DEBOUNCE_MS)

        return () => {
            if (persistTimerRef.current) {
                clearTimeout(persistTimerRef.current)
                persistTimerRef.current = null
            }
        }
    }, [eventId, role, isPlaying, currentTimeMinutes, persistToDatabase])

    return useMemo(() => ({ isFollower: role === 'follower' }), [role])
}
