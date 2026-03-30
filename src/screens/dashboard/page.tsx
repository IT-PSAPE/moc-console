import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Dot } from 'lucide-react'

export function DashboardScreen() {
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
                        <Dot className='size-4'/>
                        <Label.sm>Card Title</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <Paragraph.sm>Card content goes here.</Paragraph.sm>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4'/>
                        <Label.sm>Card Title</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <Paragraph.sm>Card content goes here.</Paragraph.sm>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4'/>
                        <Label.sm>Card Title</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <Paragraph.sm>Card content goes here.</Paragraph.sm>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <Dot className='size-4'/>
                        <Label.sm>Card Title</Label.sm>
                    </Card.Header>
                    <Card.Content className='p-4'>
                        <Paragraph.sm>Card content goes here.</Paragraph.sm>
                    </Card.Content>
                </Card.Root>
            </div>
        </section>
    )
}
