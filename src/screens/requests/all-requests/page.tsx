import { RequestCalendar } from '@/features/requests/request-calendar'
import { RequestKanban } from '@/features/requests/request-kanban'
import { RequestLists } from '@/features/requests/request-list'
import { Button } from '@/components/controls/button'
import { SegmentedControl } from '@/components/controls/segmented-control'
import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { CalendarDays, Columns3, List, Search, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Drawer } from '@/components/overlays/drawer'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'
import { useRequestFilters } from '@/features/requests/use-request-filters'
import { useRequests } from '@/features/requests/request-provider'

export function RequestsAllRequestsScreen() {
    const [view, setView] = useState('list');
    const { state: requestsState, actions: { loadActiveRequests } } = useRequests()
    const requests = requestsState.activeRequests

    useEffect(() => {
        loadActiveRequests()
    }, [loadActiveRequests])

    const requestFilters = useRequestFilters(requests);
    const { filtered, setSearch, filters: state } = requestFilters;

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
                    <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-sm' value={state.search} onChange={(e) => setSearch(e.target.value)} />
                    <Drawer.Root>
                        <Drawer.Trigger>
                            <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                        </Drawer.Trigger>
                        <RequestFilterDrawer filters={requestFilters} />
                    </Drawer.Root>
                </Header.Trail>
            </Header.Root>

            {view === 'list' && <RequestLists requests={filtered} />}
            {view === 'kanban' && <RequestKanban requests={filtered} />}
            {view === 'calendar' && <RequestCalendar requests={filtered} />}
        </section>
    )
}
