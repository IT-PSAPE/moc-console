import { Card } from '@moc/ui/components/display/card'
import { Button } from '@moc/ui/components/controls/button'
import { Header } from '@moc/ui/components/display/header'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { Indicator } from '@moc/ui/components/display/indicator'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RequestItem } from '@/features/requests/request-item'
import { useRequests } from '@/features/requests/request-provider'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import {
    ArrowRight,
    Calendar,
} from 'lucide-react'
import { Decision } from '@moc/ui/components/display/decision';
import { EmptyState } from '@moc/ui/components/feedback/empty-state';

export function DashboardScreen() {
    const navigate = useNavigate()

    const { state: { activeRequests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()

    useEffect(() => {
        loadActiveRequests()
    }, [loadActiveRequests])

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

    return (
        <section>
            <Header className='p-2 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Overview of requests.</Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 mx-auto w-full max-w-content'>
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

            </div>
        </section>
    )
}
