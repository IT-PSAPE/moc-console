export const routes = {
  // Public routes
  publicHome: '/',
  publicRequest: '/request',
  publicBooking: '/booking',
  publicConfirmation: '/confirmation',
  publicTrack: '/track',

  // Auth routes (planned)
  login: '/login',
  signup: '/signup',
  resetPassword: '/reset-password',
  passwordRecovery: '/password-recovery',

  // Protected routes (planned)
  dashboard: '/dashboard',
  users: '/users',
  requestsOverview: '/requests',
  requestsAllRequests: '/requests/all',
  requestsArchived: '/requests/archived',
  requestsDetail: '/requests/:id',
  equipmentOverview: '/equipment',
  equipmentInventory: '/equipment/inventory',
  equipmentBookings: '/equipment/bookings',
  equipmentMaintenance: '/equipment/maintenance',
  equipmentDetail: '/equipment/:id',
  broadcastOverview: '/broadcast',
  broadcastMedia: '/broadcast/media',
  broadcastPlaylists: '/broadcast/playlists',
  broadcastPlaylistDetail: '/broadcast/playlists/:id',
  cueSheetOverview: '/cue-sheet',
  cueSheetEvents: '/cue-sheet/events',
  cueSheetEventDetail: '/cue-sheet/events/:id',
  cueSheetChecklists: '/cue-sheet/checklists',
  cueSheetChecklistDetail: '/cue-sheet/checklists/:id',
  cueSheetTemplates: '/cue-sheet/templates',
}
