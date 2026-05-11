import { Card } from '@/components/display/card'
import { Button } from '@/components/controls/button'
import { Header } from '@/components/display/header'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Indicator } from '@/components/display/indicator'
import { ScrollArea } from '@/components/display/scroll-area'
import { LoadingSpinner } from '@/components/feedback/spinner'
import { RequestItem } from '@/features/requests/request-item'
import { EventItem } from '@/features/cue-sheet/event-item'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import { PlaylistListItem } from '@/features/broadcast/broadcast-list-item'
import { useRequests } from '@/features/requests/request-provider'
import { useEquipment } from '@/features/equipment/equipment-provider'
import { useBroadcast } from '@/features/broadcast/broadcast-provider'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import {
    Activity,
    ArrowRight,
    Calendar,
    CalendarClock,
    ClipboardList,
    Film,
    ListMusic,
    Package,
} from 'lucide-react'
import { Decision } from '@/components/display/decision';
import { EmptyState } from '@/components/feedback/empty-state';

export function DashboardScreen() {
    const navigate = useNavigate()

    const { state: { activeRequests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()
    const { state: { equipment }, actions: { loadEquipment, loadBookings } } = useEquipment()
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
            <Header className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Overview of requests, equipment, broadcasts, and upcoming events.</Paragraph.sm>
                </Header.Lead>
            </Header>

            {/* Summary cards */}
            <ScrollArea className='mx-auto w-full max-w-content'>
                <ScrollArea.Viewport className='p-4 pt-8'>
                    <ScrollArea.Content className='flex gap-4 max-mobile:gap-2'>
                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.requestsOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Activity className='size-4' />
                                <Label.sm>Active Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{activeRequestCount}</TextBlock>
                            </Card.Content>
                        </Card>

                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.equipmentOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Package className='size-4' />
                                <Label.sm>Equipment</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{equipment.length}</TextBlock>
                            </Card.Content>
                        </Card>

                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.broadcastOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Film className='size-4' />
                                <Label.sm>Media Library</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{media.length}</TextBlock>
                            </Card.Content>
                        </Card>

                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.cueSheetOverview}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <CalendarClock className='size-4' />
                                <Label.sm>Upcoming Events</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{upcomingEvents.length}</TextBlock>
                            </Card.Content>
                        </Card>
                    </ScrollArea.Content>
                </ScrollArea.Viewport>
            </ScrollArea>

            {/* Detail sections */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-4 mx-auto w-full max-w-content'>
                {/* Overdue requests */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <Indicator color='red' className='size-6' />
                            <Label.sm>Overdue Requests</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.requestsOverview}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={overdueRequests} loading={isLoadingActive}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Calendar />}
                                    title="No overdue requests"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {overdueRequests.slice(0, 4).map((r) => (
                                    <RequestItem key={r.id} request={r} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                {/* Upcoming requests */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <Indicator className='size-6' />
                            <Label.sm>Upcoming Requests</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.requestsOverview}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={upcomingRequests} loading={isLoadingActive}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Calendar />}
                                    title="No upcoming requests"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {upcomingRequests.slice(0, 4).map((r) => (
                                    <RequestItem key={r.id} request={r} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                {/* Upcoming events */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <CalendarClock className="size-4" />
                            <Label.sm>Upcoming Events</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.cueSheetOverview}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={upcomingEvents} loading={isLoadingEvents}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<CalendarClock />}
                                    title="No upcoming events"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {upcomingEvents.slice(0, 4).map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                {/* Active checklists */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <ClipboardList className="size-4" />
                            <Label.sm>Active Checklists</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.cueSheetChecklists}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={pendingChecklists} loading={isLoadingChecklists}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<ClipboardList />}
                                    title="No active checklists"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {pendingChecklists.slice(0, 4).map((checklist) => (
                                    <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                {/* Recent playlists */}
                <Card className="md:col-span-2">
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <ListMusic className="size-4" />
                            <Label.sm>Playlists</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.broadcastPlaylists}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={playlists} loading={isLoadingPlaylists}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<ListMusic />}
                                    title="No playlists yet"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {playlists.slice(0, 4).map((playlist) => (
                                    <PlaylistListItem key={playlist.id} playlist={playlist} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>
            </div>
        </section>
    )
}
