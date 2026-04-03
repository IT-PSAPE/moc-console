import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { EmptyState } from '@/components/feedback/empty-state'
import { Placeholder } from '@/components/placeholder'
import { LayoutDashboard } from 'lucide-react'

export function DashboardScreen() {
    return (
        <section className='flex flex-col h-full'>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Dashboard</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Welcome to the MOC Console dashboard. Here you can find an overview of all your activities and access various features.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Placeholder>
                <EmptyState icon={<LayoutDashboard />} title="Dashboard" description="Coming soon." />
            </Placeholder>
        </section>
    )
}
