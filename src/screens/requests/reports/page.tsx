import { Header } from '@/components/display/header'
import { Paragraph, Title } from '@/components/display/text'
import { Placeholder } from '@/components/placeholder'

export function RequestsReportsScreen() {
    return (
        <section className='flex flex-col h-full'>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Requests Reports</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">Review request analytics, turnaround times, and workload distribution across your team.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className='flex-1'>
                <Placeholder>Requests reports cooming soon</Placeholder>
            </div>

        </section>
    )
}
