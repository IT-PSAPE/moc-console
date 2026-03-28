export const consoleRoutes = {
    dashboard: 'dashboard',
    search: 'search',
    requestsOverview: 'requests/overview',
    requestsAllRequests: 'requests/all-requests',
    requestsArchived: 'requests/archived',
    requestsReports: 'requests/reports',
    equipmentOverview: 'equipment/overview',
    equipmentInventory: 'equipment/inventory',
    equipmentBookings: 'equipment/bookings',
    equipmentMaintenance: 'equipment/maintenance',
    equipmentReports: 'equipment/reports',
    broadcastOverview: 'broadcast/overview',
    broadcastMedia: 'broadcast/media',
    broadcastBroadcast: 'broadcast/broadcast',
    cueSheetOverview: 'cue-sheet/overview',
    cueSheetEvent: 'cue-sheet/event',
} as const

export const defaultConsoleRoute = `/${consoleRoutes.dashboard}`
