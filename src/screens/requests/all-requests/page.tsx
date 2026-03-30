import { RequestItem } from '@/components/app/request-item'
import { Button } from '@/components/controls/button'
import { SegmentedControl } from '@/components/controls/segmented-control'
import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { CalendarDays, Columns3, Dot, List, Search, Settings2 } from 'lucide-react'

export function RequestsAllRequestsScreen() {
    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>All Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Welcome to the MOC Console dashboard. Here you can find an overview of all your activities and access various features.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <SegmentedControl.Root defaultValue="list" fill>
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

            <div className='flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content'>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Overdue Requests</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className='space-y-1.5'>
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Upcoming Requests</Label.sm>
                    </Card.Header>
                    <Card.Content ghost className='space-y-1.5'>
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                    </Card.Content>
                </Card.Root>
            </div>
        </section>
    )
}
