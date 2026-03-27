import type { MediaItem, QueueItem } from '@/types'

export const mockMediaItems: MediaItem[] = [
  {
    id: 'media-001',
    title: 'National Day Highlight Reel',
    type: 'video',
    url: 'https://example.com/media/national-day-reel.mp4',
    thumbnail_url: 'https://placehold.co/320x180/1a1a2e/ffffff?text=Video',
    created_at: '2026-03-01T08:00:00Z',
  },
  {
    id: 'media-002',
    title: 'Ministry Brand Welcome Screen',
    type: 'image',
    url: 'https://example.com/media/welcome-screen.jpg',
    thumbnail_url: 'https://placehold.co/320x180/FF1493/ffffff?text=Image',
    metadata: { default_duration: 10 },
    created_at: '2026-03-02T09:00:00Z',
  },
  {
    id: 'media-003',
    title: 'Cultural Heritage Slideshow',
    type: 'slides',
    thumbnail_url: 'https://placehold.co/320x180/2d3748/ffffff?text=Slides',
    metadata: {
      slides: [
        { id: 'slide-1', url: 'https://example.com/slides/heritage-1.jpg', duration: 8 },
        { id: 'slide-2', url: 'https://example.com/slides/heritage-2.jpg', duration: 8 },
        { id: 'slide-3', url: 'https://example.com/slides/heritage-3.jpg', duration: 8 },
      ],
    },
    created_at: '2026-03-05T10:00:00Z',
  },
  {
    id: 'media-004',
    title: 'MOC Ambient Soundtrack',
    type: 'audio',
    url: 'https://example.com/media/ambient.mp3',
    thumbnail_url: 'https://placehold.co/320x180/4a5568/ffffff?text=Audio',
    created_at: '2026-03-06T11:00:00Z',
  },
  {
    id: 'media-005',
    title: 'Upcoming Events Announcement',
    type: 'image',
    url: 'https://example.com/media/upcoming-events.jpg',
    thumbnail_url: 'https://placehold.co/320x180/553c9a/ffffff?text=Image',
    metadata: { default_duration: 15 },
    created_at: '2026-03-10T12:00:00Z',
  },
  {
    id: 'media-006',
    title: 'Youth Culture Programme Promo',
    type: 'video',
    url: 'https://example.com/media/youth-promo.mp4',
    thumbnail_url: 'https://placehold.co/320x180/2c7a7b/ffffff?text=Video',
    created_at: '2026-03-12T08:30:00Z',
  },
  {
    id: 'media-007',
    title: 'Lobby Digital Signage Loop',
    type: 'slides',
    thumbnail_url: 'https://placehold.co/320x180/744210/ffffff?text=Slides',
    metadata: {
      slides: [
        { id: 'lobby-1', url: 'https://example.com/slides/lobby-1.jpg', duration: 12 },
        { id: 'lobby-2', url: 'https://example.com/slides/lobby-2.jpg', duration: 12 },
      ],
    },
    created_at: '2026-03-14T09:00:00Z',
  },
  {
    id: 'media-008',
    title: 'Traditional Music Background',
    type: 'audio',
    url: 'https://example.com/media/traditional-music.mp3',
    thumbnail_url: 'https://placehold.co/320x180/2d3748/ffffff?text=Audio',
    created_at: '2026-03-15T10:00:00Z',
  },
]

export const mockQueueItems: QueueItem[] = [
  {
    id: 'queue-001',
    media_item_id: 'media-002',
    media_item: mockMediaItems.find((m) => m.id === 'media-002'),
    broadcast_id: '1',
    display_order: 1,
    config: { duration: 10 },
  },
  {
    id: 'queue-002',
    media_item_id: 'media-001',
    media_item: mockMediaItems.find((m) => m.id === 'media-001'),
    broadcast_id: '1',
    display_order: 2,
    config: { repeat_count: 1 },
  },
  {
    id: 'queue-003',
    media_item_id: 'media-003',
    media_item: mockMediaItems.find((m) => m.id === 'media-003'),
    broadcast_id: '2',
    display_order: 1,
    config: { background_audio_id: 'media-008', background_audio_volume: 0.4 },
  },
  {
    id: 'queue-004',
    media_item_id: 'media-005',
    media_item: mockMediaItems.find((m) => m.id === 'media-005'),
    broadcast_id: '2',
    display_order: 2,
    config: { duration: 15 },
  },
  {
    id: 'queue-005',
    media_item_id: 'media-006',
    media_item: mockMediaItems.find((m) => m.id === 'media-006'),
    broadcast_id: '1',
    display_order: 3,
    config: { repeat_count: 2 },
  },
]
