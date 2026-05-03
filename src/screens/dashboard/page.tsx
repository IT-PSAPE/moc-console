import { Card } from '@/components/display/card'
import { Button } from '@/components/controls/button'
import { Header } from '@/components/display/header'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Badge } from '@/components/display/badge'
import { Indicator } from '@/components/display/indicator'
import { Spinner } from '@/components/feedback/spinner'
import { RequestItem } from '@/features/requests/request-item'
import { useRequests } from '@/features/requests/request-provider'
import { useEquipment } from '@/features/equipment/equipment-provider'
import { useBroadcast } from '@/features/broadcast/broadcast-provider'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'
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
    const { state: { equipment, bookings }, actions: { loadEquipment, loadBookings } } = useEquipment()
    const { state: { media, playlists, isLoadingPlaylists }, actions: { loadMedia, loadPlaylists } } = useBroadcast()
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

    const [now, setNow] = useState<number | null>(null)

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            setNow(Date.now())
        })

        return () => {
            window.cancelAnimationFrame(frameId)
        }
    }, [])

    // Request stats
    const overdueRequests = useMemo(() => (
        (() => {
            if (now === null) return []
            return activeRequests
                .filter((r) => r.status !== 'archived' && r.status !== 'completed' && new Date(r.dueDate).getTime() < now)
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5)
        })()
    ), [activeRequests, now])

    const upcomingRequests = useMemo(() => (
        (() => {
            if (now === null) return []
            return activeRequests
                .filter((r) => r.status !== 'archived' && r.status !== 'completed' && new Date(r.dueDate).getTime() >= now)
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5)
        })()
    ), [activeRequests, now])

    const activeRequestCount = activeRequests.filter((r) => r.status === 'in_progress' || r.status === 'not_started').length

    // Equipment stats
    const overdueBookings = useMemo(() => (
        (() => {
            if (now === null) return 0
            return bookings
                .filter((b) => b.status !== 'returned' && !b.returnedDate && new Date(b.expectedReturnAt).getTime() < now)
                .length
        })()
    ), [bookings, now])

    const maintenanceCount = equipment.filter((e) => e.status === 'maintenance').length

    // Cue sheet stats
    const upcomingEvents = useMemo(() => (
        (() => {
            if (now === null) return []
            return events
                .filter((e) => e.kind === 'instance' && e.scheduledAt && new Date(e.scheduledAt).getTime() >= now)
                .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
                .slice(0, 5)
        })()
    ), [events, now])

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

                    {/* Summary cards */}
                    <div className='grid grid-cols-2 gap-4 p-4 pt-8 mx-auto w-full max-w-content md:grid-cols-4 max-mobile:gap-2'>
                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.requestsOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Activity className='size-4' />
                                <Label.sm>Active Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{activeRequestCount}</TextBlock>
                                {overdueRequests.length > 0 && (
                                    <Badge label={`${overdueRequests.length} overdue`} color="red" />
                                )}
                            </Card.Content>
                        </Card.Root>

                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.equipmentOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Package className='size-4' />
                                <Label.sm>Equipment</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{equipment.length}</TextBlock>
                                {(overdueBookings > 0 || maintenanceCount > 0) && (
                                    <div className="flex gap-1">
                                        {overdueBookings > 0 && <Badge label={`${overdueBookings} overdue`} color="red" />}
                                        {maintenanceCount > 0 && <Badge label={`${maintenanceCount} faulty`} color="yellow" />}
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.broadcastOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Film className='size-4' />
                                <Label.sm>Media Library</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{media.length}</TextBlock>
                                <Badge label={`${playlists.length} playlists`} />
                            </Card.Content>
                        </Card.Root>

                        <Card.Root className="cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors" onClick={() => navigate(`/${routes.cueSheetOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <CalendarClock className='size-4' />
                                <Label.sm>Upcoming Events</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
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
                            <Card.Content ghost={overdueRequests.length > 0} className={overdueRequests.length > 0 ? 'flex flex-col gap-1.5' : ''}>
                                {isLoadingActive ? (
                                    <div className="flex justify-center py-6"><Spinner /></div>
                                ) : overdueRequests.length > 0 ? (
                                    overdueRequests.slice(0, 4).map((r) => (
                                        <RequestItem key={r.id} request={r} />
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No overdue requests</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                            {overdueRequests.length > 4 && (
                                <button
                                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-border-tertiary hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors"
                                    onClick={() => navigate(`/${routes.requestsOverview}`)}
                                >
                                    <Paragraph.xs className="text-tertiary">View more</Paragraph.xs>
                                    <ArrowRight className="size-3 text-tertiary" />
                                </button>
                            )}
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
                            <Card.Content ghost={upcomingRequests.length > 0} className={upcomingRequests.length > 0 ? 'flex flex-col gap-1.5' : ''}>
                                {isLoadingActive ? (
                                    <div className="flex justify-center py-6"><Spinner /></div>
                                ) : upcomingRequests.length > 0 ? (
                                    upcomingRequests.slice(0, 4).map((r) => (
                                        <RequestItem key={r.id} request={r} />
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-center">
                                        <Paragraph.sm className="text-quaternary">No upcoming requests</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                            {upcomingRequests.length > 4 && (
                                <button
                                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-border-tertiary hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors"
                                    onClick={() => navigate(`/${routes.requestsOverview}`)}
                                >
                                    <Paragraph.xs className="text-tertiary">View more</Paragraph.xs>
                                    <ArrowRight className="size-3 text-tertiary" />
                                </button>
                            )}
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
                                {isLoadingEvents ? (
                                    <div className="flex justify-center py-6"><Spinner /></div>
                                ) : upcomingEvents.length > 0 ? (
                                    upcomingEvents.slice(0, 4).map((event) => (
                                        <button
                                            key={event.id}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors text-left"
                                            onClick={() => navigate(`/${routes.cueSheetEvents}/${event.id}`)}
                                        >
                                            <div>
                                                <Label.sm>{event.title}</Label.sm>
                                                <Paragraph.xs className="text-tertiary">{event.description}</Paragraph.xs>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                                {event.scheduledAt && (
                                                    <Badge
                                                        label={formatUtcIsoInBrowserTimeZone(event.scheduledAt)}
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
                                {upcomingEvents.length > 4 && (
                                    <button
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors border-t border-border-tertiary"
                                        onClick={() => navigate(`/${routes.cueSheetOverview}`)}
                                    >
                                        <Paragraph.xs className="text-tertiary">View more</Paragraph.xs>
                                        <ArrowRight className="size-3 text-tertiary" />
                                    </button>
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
                                {isLoadingChecklists ? (
                                    <div className="flex justify-center py-6"><Spinner /></div>
                                ) : pendingChecklists.length > 0 ? (
                                    pendingChecklists.slice(0, 4).map((checklist) => (
                                        <button
                                            key={checklist.id}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors text-left"
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
                                {pendingChecklists.length > 4 && (
                                    <button
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors border-t border-border-tertiary"
                                        onClick={() => navigate(`/${routes.cueSheetChecklists}`)}
                                    >
                                        <Paragraph.xs className="text-tertiary">View more</Paragraph.xs>
                                        <ArrowRight className="size-3 text-tertiary" />
                                    </button>
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
                                {isLoadingPlaylists ? (
                                    <div className="flex justify-center py-6"><Spinner /></div>
                                ) : playlists.length > 0 ? (
                                    playlists.slice(0, 4).map((playlist) => (
                                        <button
                                            key={playlist.id}
                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors text-left"
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
                                {playlists.length > 4 && (
                                    <button
                                        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors border-t border-border-tertiary"
                                        onClick={() => navigate(`/${routes.broadcastPlaylists}`)}
                                    >
                                        <Paragraph.xs className="text-tertiary">View more</Paragraph.xs>
                                        <ArrowRight className="size-3 text-tertiary" />
                                    </button>
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
        </section>
    )
}
