import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { EmptyState } from '@/components/feedback/empty-state'
import { BarChart3 } from 'lucide-react'

export function RequestsReportsScreen() {
    return (
        <section className='flex flex-col h-full'>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Requests Reports</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Review request analytics, turnaround times, and workload distribution across your team.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className='flex-1 flex items-center justify-center mx-auto w-full max-w-content'>
                <EmptyState icon={<BarChart3 />} title="Reports" description="Coming soon." />
            </div>
        </section>
    )
}
