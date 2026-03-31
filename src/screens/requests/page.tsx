import { Card } from '@/components/display/card'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Header } from '@/components/display/header'
import { Drawer } from '@/components/overlays/drawer'
import { RequestItem } from '@/features/requests/request-item'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Dot, Search, Settings2 } from 'lucide-react'
import { Indicator } from '@/components/display/indicator'
import { useEffect, useState } from 'react'
import { fetchRequests } from '@/data/fetch-requests'
import type { Request } from '@/types/requests'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'


export function RequestsOverviewScreen() {
    const [requests, setRequests] = useState<Request[]>([]);

    useEffect(() => {
        fetchRequests().then(setRequests);
    }, []);

    const now = new Date();
    const active = requests.filter((r) => r.status === 'in_progress' || r.status === 'not_started');
    const upcoming = requests.filter((r) => r.status === 'not_started' && (!r.dueDate || new Date(r.dueDate) >= now));
    const overdue = requests.filter((r) => r.status !== 'completed' && r.dueDate && new Date(r.dueDate) < now);
    const completed = requests.filter((r) => r.status === 'completed');

    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Track and manage incoming requests. View active, upcoming, and overdue items at a glance.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className='grid grid-cols-4 gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Active Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>{active.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Upcoming Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>{upcoming.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Overdue Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>{overdue.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Completed Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>{completed.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
            </div>

            <div className='flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                <Header.Root className='pt-8'>
                    <Header.Lead className='gap-2'>
                        <Label.md>Dashboard</Label.md>
                    </Header.Lead>
                    <Header.Trail className='gap-2 flex-1 justify-end '>
                        <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-sm' />
                        <Drawer.Root>
                            <Drawer.Trigger>
                                <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                            </Drawer.Trigger>
                            <RequestFilterDrawer />
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
        </section>
    )
}