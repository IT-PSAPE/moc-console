import { useReducer, useEffect } from 'react'
import { mockCueEvents } from '@/lib/mock-cue-events'
import type { CueEvent, Track, CueItem } from '@/types'

// ── State ──────────────────────────────────────────────────────

interface CueSheetState {
  events: CueEvent[]
  activeEventId: string | null
}

function getInitialState(): CueSheetState {
  try {
    const stored = localStorage.getItem('moc-cue-sheet')
    if (stored) {
      const parsed = JSON.parse(stored) as CueSheetState
      if (Array.isArray(parsed.events) && parsed.events.length > 0) return parsed
    }
  } catch {
    // fall through to defaults
  }
  return { events: mockCueEvents, activeEventId: mockCueEvents[0]?.id ?? null }
}

// ── Actions ────────────────────────────────────────────────────

export type CueSheetAction =
  | { type: 'SET_ACTIVE_EVENT'; eventId: string }
  | { type: 'ADD_EVENT'; event: Omit<CueEvent, 'id' | 'createdAt' | 'tracks' | 'cueItems'> }
  | { type: 'UPDATE_EVENT'; eventId: string; changes: Partial<Pick<CueEvent, 'name' | 'description' | 'totalDurationMinutes'>> }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'ADD_TRACK'; eventId: string; track: Omit<Track, 'id'> }
  | { type: 'UPDATE_TRACK'; eventId: string; trackId: string; changes: Partial<Track> }
  | { type: 'DELETE_TRACK'; eventId: string; trackId: string }
  | { type: 'REORDER_TRACKS'; eventId: string; trackIds: string[] }
  | { type: 'ADD_CUE'; eventId: string; cue: Omit<CueItem, 'id'> }
  | { type: 'UPDATE_CUE'; eventId: string; cueId: string; changes: Partial<CueItem> }
  | { type: 'DELETE_CUE'; eventId: string; cueId: string }
  | { type: 'IMPORT_JSON'; data: CueSheetState }

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function patchEvent(events: CueEvent[], eventId: string, fn: (e: CueEvent) => CueEvent): CueEvent[] {
  return events.map((e) => (e.id === eventId ? fn(e) : e))
}

function reducer(state: CueSheetState, action: CueSheetAction): CueSheetState {
  switch (action.type) {
    case 'SET_ACTIVE_EVENT':
      return { ...state, activeEventId: action.eventId }

    case 'ADD_EVENT': {
      const event: CueEvent = {
        ...action.event,
        id: makeId('event'),
        createdAt: new Date().toISOString(),
        tracks: [],
        cueItems: [],
      }
      return { ...state, events: [...state.events, event], activeEventId: event.id }
    }

    case 'UPDATE_EVENT':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({ ...e, ...action.changes })),
      }

    case 'DELETE_EVENT': {
      const events = state.events.filter((e) => e.id !== action.eventId)
      const activeEventId =
        state.activeEventId === action.eventId ? (events[0]?.id ?? null) : state.activeEventId
      return { ...state, events, activeEventId }
    }

    case 'ADD_TRACK':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          tracks: [...e.tracks, { ...action.track, id: makeId('track') }],
        })),
      }

    case 'UPDATE_TRACK':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          tracks: e.tracks.map((t) => (t.id === action.trackId ? { ...t, ...action.changes } : t)),
        })),
      }

    case 'DELETE_TRACK':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          tracks: e.tracks.filter((t) => t.id !== action.trackId),
          cueItems: e.cueItems.filter((c) => c.trackId !== action.trackId),
        })),
      }

    case 'REORDER_TRACKS':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          tracks: action.trackIds.map((id) => e.tracks.find((t) => t.id === id)!).filter(Boolean),
        })),
      }

    case 'ADD_CUE':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          cueItems: [...e.cueItems, { ...action.cue, id: makeId('cue') }],
        })),
      }

    case 'UPDATE_CUE':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          cueItems: e.cueItems.map((c) => (c.id === action.cueId ? { ...c, ...action.changes } : c)),
        })),
      }

    case 'DELETE_CUE':
      return {
        ...state,
        events: patchEvent(state.events, action.eventId, (e) => ({
          ...e,
          cueItems: e.cueItems.filter((c) => c.id !== action.cueId),
        })),
      }

    case 'IMPORT_JSON':
      return action.data

    default:
      return state
  }
}

// ── Hook ───────────────────────────────────────────────────────

export function useCueSheetReducer() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)

  useEffect(() => {
    try {
      localStorage.setItem('moc-cue-sheet', JSON.stringify(state))
    } catch {
      // storage quota exceeded or unavailable — fail silently
    }
  }, [state])

  const activeEvent = state.events.find((e) => e.id === state.activeEventId) ?? null

  return { state, activeEvent, dispatch }
}
