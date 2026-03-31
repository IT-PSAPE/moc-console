import { RequestCalendar } from '@/components/app/requests/request-calendar'
import { RequestKanban } from '@/components/app/requests/request-kanban'
import { RequestLists } from '@/components/app/requests/request-list'
import { Button } from '@/components/controls/button'
import { SegmentedControl } from '@/components/controls/segmented-control'
import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { CalendarDays, Columns3, List, Search, Settings2 } from 'lucide-react'
import { useState } from 'react'

export function RequestsAllRequestsScreen() {
    const [view, setView] = useState('list');

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
                    <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                </Header.Trail>
            </Header.Root>

            {view === 'list' && <RequestLists />}
            {view === 'kanban' && <RequestKanban />}
            {view === 'calendar' && <RequestCalendar />}
        </section>
    )
}
