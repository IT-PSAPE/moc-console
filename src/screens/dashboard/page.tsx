import { Card } from '@/components/display/card'
import { Button } from '@/components/controls/button'
import { Header } from '@/components/display/header'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Badge } from '@/components/display/badge'
import { Indicator } from '@/components/display/indicator'
import { Decision } from '@/components/display/decision'
import { Spinner } from '@/components/feedback/spinner'
import { RequestItem } from '@/features/requests/request-item'
import { useRequests } from '@/features/requests/request-provider'
import { useEquipment } from '@/features/equipment/equipment-provider'
import { useBroadcast } from '@/features/broadcast/broadcast-provider'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import {
    Activity,
    ArrowRight,
    CalendarClock,
    ClipboardList,
    Film,
    ListMusic,
    Package,
} from 'lucide-react'

export function DashboardScreen() {
    const navigate = useNavigate()

    const { state: { activeRequests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()
    const { state: { equipment, bookings, isLoadingEquipment, isLoadingBookings }, actions: { loadEquipment, loadBookings } } = useEquipment()
    const { state: { media, playlists, isLoadingMedia, isLoadingPlaylists }, actions: { loadMedia, loadPlaylists } } = useBroadcast()
    const { state: { events, checklists, isLoadingEvents, isLoadingChecklists }, actions: { loadEvents, loadChecklists } } = useCueSheet()

    useEffect(() => {
        loadActiveRequests()
        loadEquipment()
        loadBookings()
        loadMedia()
        loadPlaylists()
        loadEvents()
        loadChecklists()
    }, [loadActiveRequests, loadEquipment, loadBookings, loadMedia, loadPlaylists, loadEvents, loadChecklists])

    const isLoading = isLoadingActive || isLoadingEquipment || isLoadingBookings || isLoadingMedia || isLoadingPlaylists || isLoadingEvents || isLoadingChecklists
    const hasData = activeRequests.length > 0 || equipment.length > 0 || media.length > 0 || events.length > 0

    // Request stats
    const now = new Date()
    const overdueRequests = useMemo(() => (
        activeRequests
            .filter((r) => r.status !== 'archived' && r.status !== 'completed' && r.dueDate && new Date(r.dueDate) < now)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 5)
    ), [activeRequests])

    const upcomingRequests = useMemo(() => (
        activeRequests
            .filter((r) => r.status !== 'archived' && r.status !== 'completed' && r.dueDate && new Date(r.dueDate) >= now)
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
            .slice(0, 5)
    ), [activeRequests])

    const activeRequestCount = activeRequests.filter((r) => r.status === 'in_progress' || r.status === 'not_started').length

    // Equipment stats
    const overdueBookings = useMemo(() => (
        bookings
            .filter((b) => b.status !== 'returned' && !b.returnedDate && new Date(b.expectedReturnAt) < now)
            .length
    ), [bookings])

    const maintenanceCount = equipment.filter((e) => e.status === 'maintenance').length

    // Cue sheet stats
    const upcomingEvents = useMemo(() => (
        events
            .filter((e) => e.kind === 'instance' && e.scheduledAt && new Date(e.scheduledAt) >= now)
            .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
            .slice(0, 5)
    ), [events])

    const pendingChecklists = useMemo(() => (
        checklists
            .filter((c) => c.kind === 'instance')
            .map((c) => {
                const totalItems = c.items.length + c.sections.reduce((sum, s) => sum + s.items.length, 0)
                const checkedItems = c.items.filter((i) => i.checked).length + c.sections.reduce((sum, s) => sum + s.items.filter((i) => i.checked).length, 0)
                return { ...c, totalItems, checkedItems, progress: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0 }
            })
            .filter((c) => c.progress < 100)
            .sort((a, b) => new Date(a.scheduledAt ?? a.createdAt).getTime() - new Date(b.scheduledAt ?? b.createdAt).getTime())
            .slice(0, 5)
    ), [checklists])

    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Overview of requests, equipment, broadcasts, and upcoming events.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={hasData || null} loading={isLoading}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Empty>
                <Decision.Data>
                    {/* Summary cards */}
                    <div className='grid grid-cols-2 gap-4 p-4 pt-8 mx-auto w-full max-w-content md:grid-cols-4 max-mobile:gap-2'>
                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.requestsOverview}`)}>
                            <Card.Header className='gap-1.5'>
                                <Activity className='size-4' />
                                <Label.sm>Active Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4 flex items-end justify-between'>
                                <TextBlock className='title-h4'>{activeRequestCount}</TextBlock>
                                {overdueRequests.length > 0 && (
                                    <Badge label={`${overdueRequests.length} overdue`} color="red" />
                                )}
                            </Card.Content>
                        </Card.Root>

                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.equipmentOverview}`)}>
                            <Card.Header className='gap-1.5'>
                                <Package className='size-4' />
                                <Label.sm>Equipment</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4 flex items-end justify-between'>
                                <TextBlock className='title-h4'>{equipment.length}</TextBlock>
                                {(overdueBookings > 0 || maintenanceCount > 0) && (
                                    <div className="flex gap-1">
                                        {overdueBookings > 0 && <Badge label={`${overdueBookings} overdue`} color="red" />}
                                        {maintenanceCount > 0 && <Badge label={`${maintenanceCount} faulty`} color="yellow" />}
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.broadcastOverview}`)}>
                            <Card.Header className='gap-1.5'>
                                <Film className='size-4' />
                                <Label.sm>Media Library</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4 flex items-end justify-between'>
                                <TextBlock className='title-h4'>{media.length}</TextBlock>
                                <Badge label={`${playlists.length} playlists`} />
                            </Card.Content>
                        </Card.Root>

                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.cueSheetOverview}`)}>
                            <Card.Header className='gap-1.5'>
                                <CalendarClock className='size-4' />
                                <Label.sm>Upcoming Events</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4 flex items-end justify-between'>
                                <TextBlock className='title-h4'>{upcomingEvents.length}</TextBlock>
                                {pendingChecklists.length > 0 && (
                                    <Badge label={`${pendingChecklists.length} checklists`} color="blue" />
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>

                    {/* Detail sections */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-4 mx-auto w-full max-w-content'>
                        {/* Overdue requests */}
                        <Card.Root>
                            <Card.Header className='gap-1.5 justify-between'>
                                <div className="flex items-center gap-1.5">
                                    <Indicator color='red' className='size-6' />
                                    <Label.sm>Overdue Requests</Label.sm>
                                </div>
                                <Button variant="ghost" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.requestsOverview}`)}>View all</Button>
                            </Card.Header>
                            <Card.Content ghost className='flex flex-col gap-1.5'>
                                {overdueRequests.length > 0 ? (
                                    overdueRequests.map((r) => (
                                        <RequestItem key={r.id} request={r} />
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No overdue requests</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        {/* Upcoming requests */}
                        <Card.Root>
                            <Card.Header className='gap-1.5 justify-between'>
                                <div className="flex items-center gap-1.5">
                                    <Indicator className='size-6' />
                                    <Label.sm>Upcoming Requests</Label.sm>
                                </div>
                                <Button variant="ghost" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.requestsOverview}`)}>View all</Button>
                            </Card.Header>
                            <Card.Content ghost className='flex flex-col gap-1.5'>
                                {upcomingRequests.length > 0 ? (
                                    upcomingRequests.map((r) => (
                                        <RequestItem key={r.id} request={r} />
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No upcoming requests</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        {/* Upcoming events */}
                        <Card.Root>
                            <Card.Header className='gap-1.5 justify-between'>
                                <div className="flex items-center gap-1.5">
                                    <CalendarClock className="size-4" />
                                    <Label.sm>Upcoming Events</Label.sm>
                                </div>
                                <Button variant="ghost" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.cueSheetOverview}`)}>View all</Button>
                            </Card.Header>
                            <Card.Content className={upcomingEvents.length > 0 ? 'divide-y divide-border-tertiary' : ''}>
                                {upcomingEvents.length > 0 ? (
                                    upcomingEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-primary-hover transition-colors text-left"
                                            onClick={() => navigate(`/${routes.cueSheetEvents}/${event.id}`)}
                                        >
                                            <div>
                                                <Label.sm>{event.title}</Label.sm>
                                                <Paragraph.xs className="text-tertiary">{event.description}</Paragraph.xs>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                                {event.scheduledAt && (
                                                    <Badge
                                                        label={new Date(event.scheduledAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        variant="outline"
                                                    />
                                                )}
                                                <Badge label={`${event.duration}m`} />
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No upcoming events</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        {/* Active checklists */}
                        <Card.Root>
                            <Card.Header className='gap-1.5 justify-between'>
                                <div className="flex items-center gap-1.5">
                                    <ClipboardList className="size-4" />
                                    <Label.sm>Active Checklists</Label.sm>
                                </div>
                                <Button variant="ghost" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.cueSheetChecklists}`)}>View all</Button>
                            </Card.Header>
                            <Card.Content className={pendingChecklists.length > 0 ? 'divide-y divide-border-tertiary' : ''}>
                                {pendingChecklists.length > 0 ? (
                                    pendingChecklists.map((checklist) => (
                                        <button
                                            key={checklist.id}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-primary-hover transition-colors text-left"
                                            onClick={() => navigate(`/${routes.cueSheetChecklists}/${checklist.id}`)}
                                        >
                                            <div>
                                                <Label.sm>{checklist.name}</Label.sm>
                                                <Paragraph.xs className="text-tertiary">{checklist.checkedItems}/{checklist.totalItems} completed</Paragraph.xs>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                                <div className="w-20 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-utility-blue-500 rounded-full transition-all"
                                                        style={{ width: `${checklist.progress}%` }}
                                                    />
                                                </div>
                                                <Paragraph.xs className="text-tertiary w-8 text-right">{checklist.progress}%</Paragraph.xs>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No active checklists</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        {/* Recent playlists */}
                        <Card.Root className="md:col-span-2">
                            <Card.Header className='gap-1.5 justify-between'>
                                <div className="flex items-center gap-1.5">
                                    <ListMusic className="size-4" />
                                    <Label.sm>Playlists</Label.sm>
                                </div>
                                <Button variant="ghost" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.broadcastPlaylists}`)}>View all</Button>
                            </Card.Header>
                            <Card.Content className={playlists.length > 0 ? 'divide-y divide-border-tertiary' : ''}>
                                {playlists.length > 0 ? (
                                    playlists.slice(0, 5).map((playlist) => (
                                        <button
                                            key={playlist.id}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-primary-hover transition-colors text-left"
                                            onClick={() => navigate(`/${routes.broadcastPlaylists}/${playlist.id}`)}
                                        >
                                            <div>
                                                <Label.sm>{playlist.name}</Label.sm>
                                                <Paragraph.xs className="text-tertiary">{playlist.description}</Paragraph.xs>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                                <Badge label={`${playlist.cues.length} cues`} />
                                                <Badge
                                                    label={playlist.status === 'published' ? 'Published' : 'Draft'}
                                                    color={playlist.status === 'published' ? 'green' : 'gray'}
                                                />
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No playlists yet</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Decision.Data>
            </Decision.Root>
        </section>
    )
}
