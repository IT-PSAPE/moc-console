import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

// ── Auth & Users ──────────────────────────────────────────────

export type Role = 'admin' | 'manager' | 'editor' | 'viewer'

export type Permission = 'view' | 'create' | 'edit' | 'delete' | 'admin'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: Role
  permissions: Permission[]
  created_at: string
}

// ── Portal Registry ───────────────────────────────────────────

export interface PortalSection {
  id: string
  label: string
  path: string
  icon?: LucideIcon
}

export interface PortalConfig {
  id: string
  label: string
  icon: LucideIcon
  basePath: string
  sections: PortalSection[]
  component: ComponentType
  requiredPermission?: Permission
  requiredRole?: Role
}

// ── Sidebar ───────────────────────────────────────────────────

export interface SidebarState {
  expandedPortal: string | null
  collapsed: boolean
  mobileOpen: boolean
}

// ── Requests (5W+1H model) ────────────────────────────────────

export type RequestType = 'event' | 'program' | 'venue' | 'equipment' | 'media' | 'other'

export type RequestFlow = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed'

// Keep alias for backward compat with status-badge and filter values
export type RequestStatus = RequestFlow

export interface RequestNote {
  id: string
  request_id: string
  author: string
  body: string
  created_at: string
}

export interface RequestAssignee {
  id: string
  request_id: string
  member_id: string
  member_name: string
}

export interface CultureRequest {
  id: string
  title: string
  // 5W+1H
  who: string
  what: string
  when: string
  where: string
  why: string
  how: string
  // Meta
  requester_email: string
  type: RequestType
  status: RequestFlow
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  notes?: RequestNote[]
  assignees?: RequestAssignee[]
  created_at: string
  updated_at: string
}

// ── Equipment ─────────────────────────────────────────────────

export type EquipmentStatus = 'available' | 'assigned' | 'maintenance' | 'retired'

export interface Equipment {
  id: string
  name: string
  category: string
  serial_number: string
  status: EquipmentStatus
  assigned_to?: string
  location: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  last_maintenance?: string
  created_at: string
}

// ── Broadcasting ──────────────────────────────────────────────

export type BroadcastStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled'

export interface Broadcast {
  id: string
  title: string
  description: string
  channel: string
  status: BroadcastStatus
  scheduled_at?: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  viewer_count?: number
  created_at: string
}

// ── Media Library (from announcement-broadcast) ───────────────

export type MediaType = 'video' | 'image' | 'audio' | 'slides'

export interface MediaSlide {
  id: string
  url: string
  duration?: number
}

export interface MediaItem {
  id: string
  title: string
  type: MediaType
  url?: string
  thumbnail_url?: string
  metadata?: {
    default_duration?: number
    slides?: MediaSlide[]
  }
  created_at: string
}

export interface QueueItemConfig {
  duration?: number
  repeat_count?: number
  mute?: boolean
  background_audio_id?: string
  background_audio_volume?: number
}

export interface QueueItem {
  id: string
  media_item_id: string
  media_item?: MediaItem
  display_order: number
  config: QueueItemConfig
}

// ── Cue Sheet (from cue-sheet) ────────────────────────────────

export type CueTypeIcon =
  | 'music' | 'wrench' | 'microphone' | 'transition' | 'star' | 'flag'
  | 'bolt' | 'bell' | 'users' | 'camera' | 'video' | 'lightbulb' | 'clock'
  | 'clipboard' | 'speaker' | 'check-circle' | 'alert'

export interface CueType {
  id: string
  name: string
  icon: CueTypeIcon
}

export interface Track {
  id: string
  name: string
  color: string
  hidden?: boolean
  locked?: boolean
}

export interface CueItem {
  id: string
  title: string
  type: string
  trackId: string
  startMinute: number
  durationMinutes: number
  notes: string
}

export interface CueEvent {
  id: string
  name: string
  description: string
  totalDurationMinutes: number
  tracks: Track[]
  cueItems: CueItem[]
  createdAt: string
}

// ── Table ─────────────────────────────────────────────────────

export interface ColumnDef<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  render?: (value: unknown, row: T) => React.ReactNode
  className?: string
}

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}
