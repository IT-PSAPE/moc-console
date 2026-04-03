import { Card } from '@/components/display/card'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Header } from '@/components/display/header'
import { Drawer } from '@/components/overlays/drawer'
import { RequestItem } from '@/features/requests/request-item'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Activity, CalendarClock, CircleAlert, CircleCheck, Inbox, Search, Settings2 } from 'lucide-react'
import { Indicator } from '@/components/display/indicator'
import { useEffect } from 'react'
import { Decision } from '@/components/display/decision'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'
import { useRequestFilters } from '@/features/requests/use-request-filters'
import { useRequests } from '@/features/requests/request-provider'


export function RequestsOverviewScreen() {
    const { state: { activeRequests: requests, isLoadingActive }, actions: { loadActiveRequests } } = useRequests()

    useEffect(() => {
        loadActiveRequests()
    }, [loadActiveRequests])

    const requestFilters = useRequestFilters(requests);
    const { filtered, setSearch, filters: state } = requestFilters;

    // Stats — always derived from the full unfiltered dataset
    const now = new Date();
    const activeCount = requests.filter((r) => r.status === 'in_progress' || r.status === 'not_started').length;
    const upcomingCount = requests.filter((r) => r.status !== 'archived' && r.status !== 'completed' && r.dueDate && new Date(r.dueDate) > now).length;
    const overdueCount = requests.filter((r) => r.status !== 'archived' && r.status !== 'completed' && r.dueDate && new Date(r.dueDate) < now).length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;

    // Dashboard lists — derived from filtered results
    const overdue = filtered.filter((r) => r.status !== 'archived' && r.status !== 'completed' && r.dueDate && new Date(r.dueDate) < now);
    const upcoming = filtered.filter((r) => r.status !== 'archived' && r.status !== 'completed' && r.dueDate && new Date(r.dueDate) > now);

    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Track and manage incoming requests. View active, upcoming, and overdue items at a glance.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={requests} loading={isLoadingActive}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<Inbox />}
                        title="No requests yet"
                        description="Create your first request to get started."
                    />
                </Decision.Empty>
                <Decision.Data>
                    <div className='grid grid-cols-4 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:grid-cols-2 max-mobile:gap-2'>
                        <Card.Root>
                            <Card.Header className='gap-1.5'>
                                <Activity className='size-4' />
                                <Label.sm>Active Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{activeCount}</TextBlock>
                            </Card.Content>
                        </Card.Root>
                        <Card.Root>
                            <Card.Header className='gap-1.5'>
                                <CalendarClock className='size-4' />
                                <Label.sm>Upcoming Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{upcomingCount}</TextBlock>
                            </Card.Content>
                        </Card.Root>
                        <Card.Root>
                            <Card.Header className='gap-1.5'>
                                <CircleAlert className='size-4' />
                                <Label.sm>Overdue Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{overdueCount}</TextBlock>
                            </Card.Content>
                        </Card.Root>
                        <Card.Root>
                            <Card.Header className='gap-1.5'>
                                <CircleCheck className='size-4' />
                                <Label.sm>Completed Requests</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{completedCount}</TextBlock>
                            </Card.Content>
                        </Card.Root>
                    </div>

                    <div className='flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                        <Header.Root className='gap-2 max-mobile:flex-col *:max-mobile:w-full'>
                            <Header.Lead className='gap-2'>
                                <Label.md>Schedule</Label.md>
                            </Header.Lead>
                            <Header.Trail className='gap-2 flex-1 justify-end '>
                                <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-sm' value={state.search} onChange={(e) => setSearch(e.target.value)} />
                                <Drawer.Root>
                                    <Drawer.Trigger>
                                        <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                                    </Drawer.Trigger>
                                    <RequestFilterDrawer filters={requestFilters} />
                                </Drawer.Root>
                            </Header.Trail>
                        </Header.Root>

                        {overdue.length > 0 && (
                            <Card.Root>
                                <Card.Header className='gap-1.5'>
                                    <Indicator color='red' className='size-6' />
                                    <Label.sm>Overdue Requests</Label.sm>
                                </Card.Header>
                                <Card.Content ghost className='flex flex-col gap-1.5'>
                                    {overdue.map((r) => (
                                        <RequestItem key={r.id} request={r} />
                                    ))}
                                </Card.Content>
                            </Card.Root>
                        )}

                        {upcoming.length > 0 && (
                            <Card.Root>
                                <Card.Header className='gap-1.5'>
                                    <Indicator className='size-6' />
                                    <Label.sm>Upcoming Requests</Label.sm>
                                </Card.Header>
                                <Card.Content ghost className='flex flex-col gap-1.5'>
                                    {upcoming.map((r) => (
                                        <RequestItem key={r.id} request={r} />
                                    ))}
                                </Card.Content>
                            </Card.Root>
                        )}
                    </div>
                </Decision.Data>
            </Decision.Root>
        </section>
    )
}
