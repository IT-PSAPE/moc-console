import { Card } from '@/components/display/card'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Header } from '@/components/display/header'
import { Drawer } from '@/components/overlays/drawer'
import { RequestItem } from '@/features/requests/request-item'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Activity, CalendarClock, CircleAlert, CircleCheck, FileWarning, Search, Settings2 } from 'lucide-react'
import { Indicator } from '@/components/display/indicator'
import { useEffect } from 'react'
import { LoadingSpinner } from '@/components/feedback/spinner'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'
import { useRequestFilters } from '@/features/requests/use-request-filters'
import { useRequests } from '@/features/requests/request-provider'
import { ScrollArea } from '@/components/display/scroll-area';
import { Decision } from '@/components/display/decision';
import { EmptyState } from '@/components/feedback/empty-state';


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
    const upcomingCount = requests.filter((r) => r.status !== 'archived' && r.status !== 'completed' && new Date(r.dueDate) > now).length;
    const overdueCount = requests.filter((r) => r.status !== 'archived' && r.status !== 'completed' && new Date(r.dueDate) < now).length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;

    // Dashboard lists — derived from filtered results
    const overdue = filtered.filter((r) => r.status !== 'archived' && r.status !== 'completed' && new Date(r.dueDate) < now);
    const upcoming = filtered.filter((r) => r.status !== 'archived' && r.status !== 'completed' && new Date(r.dueDate) > now);

    function onSearch(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) {
        setSearch(e.target.value)
    }

    return (
        <section>
            <Header className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Track and manage incoming requests. View active, upcoming, and overdue items at a glance.</Paragraph.sm>
                </Header.Lead>
            </Header>

            <ScrollArea className='mx-auto w-full max-w-content'>
                <ScrollArea.Viewport className='p-4 pt-8'>
                    <ScrollArea.Content className='flex gap-4 max-mobile:gap-2'>
                        <Card className="flex-1 min-w-56">
                            <Card.Header tight className='gap-1.5'>
                                <Activity className='size-4' />
                                <Label.sm>Active</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{activeCount}</TextBlock>
                            </Card.Content>
                        </Card>
                        <Card className="flex-1 min-w-56">
                            <Card.Header tight className='gap-1.5'>
                                <CalendarClock className='size-4' />
                                <Label.sm>Upcoming</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{upcomingCount}</TextBlock>
                            </Card.Content>
                        </Card>
                        <Card className="flex-1 min-w-56">
                            <Card.Header tight className='gap-1.5'>
                                <CircleAlert className='size-4' />
                                <Label.sm>Overdue</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{overdueCount}</TextBlock>
                            </Card.Content>
                        </Card>
                        <Card className="flex-1 min-w-56">
                            <Card.Header tight className='gap-1.5'>
                                <CircleCheck className='size-4' />
                                <Label.sm>Completed</Label.sm>
                            </Card.Header>
                            <Card.Content className='p-4'>
                                <TextBlock className='title-h4'>{completedCount}</TextBlock>
                            </Card.Content>
                        </Card>
                    </ScrollArea.Content>
                </ScrollArea.Viewport>
            </ScrollArea>

            <div className='flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                <Header className='gap-2 max-mobile:flex-col *:max-mobile:w-full'>
                    <Header.Lead className='gap-2'>
                        <Label.md>Schedule</Label.md>
                    </Header.Lead>
                    <Header.Trail className='gap-2 flex-1 justify-end '>
                        <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-md' value={state.search} onChange={onSearch} />
                        <Drawer>
                            <Drawer.Trigger>
                                <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                            </Drawer.Trigger>
                            <RequestFilterDrawer filters={requestFilters} />
                        </Drawer>
                    </Header.Trail>
                </Header>

                <Card>
                    <Card.Header tight>
                        <Indicator color='red' className='size-6' />
                        <Label.sm>Overdue Requests</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={overdue} loading={isLoadingActive}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<FileWarning />}
                                    title={'No overdue requests'}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {overdue.map((r) => (<RequestItem key={r.id} request={r} />))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                <Card>
                    <Card.Header tight>
                        <Indicator className='size-6' />
                        <Label.sm>Upcoming Requests</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={upcoming} loading={isLoadingActive}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<FileWarning />}
                                    title={'No upcoming requests'}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {upcoming.map((r) => (<RequestItem key={r.id} request={r} />))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>
            </div>
        </section>
    )
}
