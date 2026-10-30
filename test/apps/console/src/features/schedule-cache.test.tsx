import { QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Request } from '@moc/types/requests'
import { queryClient } from '../../../../../apps/console/src/lib/query-client'
import { clearWorkspaceResources, setWorkspaceResourceData, workspaceResourceKey } from '../../../../../apps/console/src/data/workspace-resource-cache'
import { RequestsProvider } from '../../../../../apps/console/src/features/requests/request-provider'
import { EquipmentProvider } from '../../../../../apps/console/src/features/equipment/equipment-provider'
import { VenueBookingsProvider } from '../../../../../apps/console/src/features/venues/venue-bookings-provider'
import { useSchedule } from '../../../../../apps/console/src/features/schedule/use-schedule'

vi.mock('../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: 'workspace' }) }))
vi.mock('../../../../../apps/console/src/features/preferences/user-preferences-provider', () => ({
  useUserPreferences: () => ({ state: { defaultCalendarView: 'agenda', isLoading: false }, actions: { retry: vi.fn() } }),
}))

const request = { id: 'request', title: 'Cached work', status: 'not_started', dueDate: '2030-01-01', category: 'crew' } as Request

function readSchedule(): ReturnType<typeof useSchedule> {
  let result: ReturnType<typeof useSchedule> | undefined
  function Probe() {
    result = useSchedule()
    return null
  }
  renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/work?view=agenda&workScope=workspace']}>
        <RequestsProvider><EquipmentProvider><VenueBookingsProvider><Probe /></VenueBookingsProvider></EquipmentProvider></RequestsProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  if (!result) throw new Error('Schedule did not render')
  return result
}

beforeEach(() => {
  clearWorkspaceResources()
  setWorkspaceResourceData('workspace', 'request-categories', [])
  setWorkspaceResourceData('workspace', 'venues', [])
  setWorkspaceResourceData('workspace', 'venue-events', [])
})
afterEach(clearWorkspaceResources)

test('Work renders the existing collection cache immediately without a separate calendar fetch', () => {
  setWorkspaceResourceData('workspace', 'requests:active', [request])
  setWorkspaceResourceData('workspace', 'bookings', [])
  setWorkspaceResourceData('workspace', 'venue-bookings', [])
  const result = readSchedule()
  expect(result.state.isInitialLoading).toBe(false)
  expect(result.state.events.map((event) => event.data?.title)).toEqual(['Cached work'])
})

test('saved collection changes appear in Work without reloading all three collections', () => {
  setWorkspaceResourceData('workspace', 'requests:active', [request])
  setWorkspaceResourceData('workspace', 'bookings', [])
  setWorkspaceResourceData('workspace', 'venue-bookings', [])
  readSchedule()
  setWorkspaceResourceData('workspace', 'requests:active', [{ ...request, title: 'Saved work' }])
  expect(readSchedule().state.events.map((event) => event.data?.title)).toEqual(['Saved work'])
  expect(queryClient.getQueryState(workspaceResourceKey('workspace', 'bookings'))?.isInvalidated).toBe(false)
  expect(queryClient.getQueryState(workspaceResourceKey('workspace', 'venue-bookings'))?.isInvalidated).toBe(false)
})

test('an unfetched collection still shows initial loading rather than an incomplete calendar', () => {
  setWorkspaceResourceData('workspace', 'requests:active', [request])
  setWorkspaceResourceData('workspace', 'bookings', [])
  expect(readSchedule().state.isInitialLoading).toBe(true)
})

test('cached Work stays visible when a collection background refresh fails', async () => {
  setWorkspaceResourceData('workspace', 'requests:active', [request])
  setWorkspaceResourceData('workspace', 'bookings', [])
  setWorkspaceResourceData('workspace', 'venue-bookings', [])
  await queryClient.fetchQuery({ queryKey: workspaceResourceKey('workspace', 'requests:active'), staleTime: 0, queryFn: async () => { throw new Error('Offline') } }).catch(() => undefined)
  const result = readSchedule()
  expect(result.state.isInitialLoading).toBe(false)
  expect(result.state.error).toBeNull()
  expect(result.state.events.map((event) => event.data?.title)).toEqual(['Cached work'])
})
