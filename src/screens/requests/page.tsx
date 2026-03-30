import { Card } from '@/components/card'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Header } from '@/components/header'
import { RequestItem } from '@/components/request-item'
import { Label, Paragraph, TextBlock, Title } from '@/components/text'
import { Dot, Search, Settings2 } from 'lucide-react'

export function RequestsOverviewScreen() {
    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Welcome to the MOC Console dashboard. Here you can find an overview of all your activities and access various features.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className='grid grid-cols-4 gap-4 p-4 pt-8 mx-auto w-full max-w-content'>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Active Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>12</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Upcoming Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>7</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Overdue Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>5</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4' />
                        <Label.sm>Completed Requests</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <TextBlock className='title-h4'>14</TextBlock>
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
                        <Button variant='secondary' icon={<Settings2 />}>Filter</Button>
                    </Header.Trail>
                </Header.Root>
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
