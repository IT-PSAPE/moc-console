import { Card } from '@moc/ui/components/display/card'
import { Button } from '@moc/ui/components/controls/button'
import { Header } from '@moc/ui/components/display/header'
import { Label, Paragraph, TextBlock, Title } from '@moc/ui/components/display/text'
import { Indicator } from '@moc/ui/components/display/indicator'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RequestItem } from '@/features/requests/request-item'
import { EquipmentItem } from '@/features/equipment/equipment-item'
import { useRequests } from '@/features/requests/request-provider'
import { useEquipment } from '@/features/equipment/equipment-provider'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import type { Equipment } from '@moc/types/equipment'
import {
    Activity,
    ArrowRight,
    Calendar,
    CalendarX2Icon,
    FileWarning,
    Package,
    Wrench,
} from 'lucide-react'
import { Decision } from '@moc/ui/components/display/decision';
import { EmptyState } from '@moc/ui/components/feedback/empty-state';

export function DashboardScreen() {
    const navigate = useNavigate()

    const { state: { activeRequests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()
    const { state: { equipment, bookings, isLoadingEquipment, isLoadingBookings }, actions: { loadEquipment, loadBookings } } = useEquipment()

    useEffect(() => {
        loadActiveRequests()
        loadEquipment()
        loadBookings()
    }, [loadActiveRequests, loadEquipment, loadBookings])

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
    const equipmentMap = useMemo(() => new Map(equipment.map((item) => [item.id, item])), [equipment])

    const overdueEquipment = useMemo<Equipment[]>(() => {
        if (now === null) return []

        const seen = new Set<string>()
        const overdue: Equipment[] = []

        const sorted = bookings
            .filter((booking) =>
                booking.status !== 'returned' &&
                !booking.returnedDate &&
                new Date(booking.expectedReturnAt).getTime() < now,
            )
            .sort((a, b) => new Date(a.expectedReturnAt).getTime() - new Date(b.expectedReturnAt).getTime())

        for (const booking of sorted) {
            for (const item of booking.items) {
                if (seen.has(item.equipmentId)) continue
                const record = equipmentMap.get(item.equipmentId)
                if (!record) continue
                seen.add(item.equipmentId)
                overdue.push(record)
                if (overdue.length >= 5) return overdue
            }
        }

        return overdue
    }, [bookings, equipmentMap, now])

    const maintenanceEquipment = useMemo<Equipment[]>(() => (
        equipment
            .filter((item) => item.status === 'maintenance')
            .sort((a, b) => new Date(a.lastActiveDate).getTime() - new Date(b.lastActiveDate).getTime())
            .slice(0, 5)
    ), [equipment])

    return (
        <section>
            <Header className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Overview of requests, equipment and bookings.</Paragraph.sm>
                </Header.Lead>
            </Header>

            {/* Summary cards */}
            <ScrollArea className='mx-auto w-full max-w-content'>
                <ScrollArea.Viewport className='p-4 pt-8'>
                    <ScrollArea.Content className='flex gap-4 max-mobile:gap-2'>
                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.requests}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Activity className='size-4' />
                                <Label.sm>Active Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{activeRequestCount}</TextBlock>
                            </Card.Content>
                        </Card>

                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.equipment}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Package className='size-4' />
                                <Label.sm>Equipment</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{equipment.length}</TextBlock>
                            </Card.Content>
                        </Card>

                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.bookings}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <CalendarX2Icon className='size-4' />
                                <Label.sm>Overdue Equipment</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{overdueEquipment.length}</TextBlock>
                            </Card.Content>
                        </Card>

                        <Card className="flex-1 min-w-56" onClick={() => navigate(`/${routes.equipment}`)}>
                            <Card.Header tight className='gap-1.5'>
                                <Wrench className='size-4' />
                                <Label.sm>In Maintenance</Label.sm>
                            </Card.Header>
                            <Card.Content className='h-full p-4 flex items-end justify-between gap-1 flex-wrap'>
                                <TextBlock className='title-h4'>{maintenanceEquipment.length}</TextBlock>
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
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.requests}`)}>View all</Button>
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
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.requests}`)}>View all</Button>
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

                {/* Overdue equipment */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <Indicator color='red' className='size-6' />
                            <Label.sm>Overdue Equipment</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.bookings}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={overdueEquipment} loading={isLoadingEquipment || isLoadingBookings}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<FileWarning />}
                                    title="No overdue equipment"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {overdueEquipment.slice(0, 4).map((item) => (
                                    <EquipmentItem key={item.id} equipment={item} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                {/* Equipment in maintenance */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <Wrench className="size-4" />
                            <Label.sm>In Maintenance</Label.sm>
                        </div>
                        <Button variant="secondary" icon={<ArrowRight />} iconPosition="trailing" onClick={() => navigate(`/${routes.equipment}`)}>View all</Button>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={maintenanceEquipment} loading={isLoadingEquipment}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Wrench />}
                                    title="No equipment in maintenance"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {maintenanceEquipment.slice(0, 4).map((item) => (
                                    <EquipmentItem key={item.id} equipment={item} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>
            </div>
        </section>
    )
}
