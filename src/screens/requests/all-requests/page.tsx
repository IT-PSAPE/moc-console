import { RequestCalendar } from '@/features/requests/request-calendar'
import { RequestKanban } from '@/features/requests/request-kanban'
import { RequestLists } from '@/features/requests/request-list'
import { Button } from '@/components/controls/button'
import { SegmentedControl } from '@/components/controls/segmented-control'
import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { fetchRequests } from '@/data/fetch-requests'
import type { Request } from '@/types/requests'
import { CalendarDays, Columns3, List, Search, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Drawer } from '@/components/overlays/drawer'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'

export function RequestsAllRequestsScreen() {
    const [view, setView] = useState('list');
    const [requests, setRequests] = useState<Request[]>([]);

    useEffect(() => {
        fetchRequests().then(setRequests);
    }, []);

    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>All Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Browse, search, and filter all submitted requests across every status and category.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <SegmentedControl.Root defaultValue="list" onValueChange={(value) => setView(value)}>
                        <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
                        <SegmentedControl.Item value="kanban" icon={<Columns3 />}>Kanban</SegmentedControl.Item>
                        <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
                    </SegmentedControl.Root>
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

            {view === 'list' && <RequestLists requests={requests} />}
            {view === 'kanban' && <RequestKanban requests={requests} />}
            {view === 'calendar' && <RequestCalendar requests={requests} />}
        </section>
    )
}
