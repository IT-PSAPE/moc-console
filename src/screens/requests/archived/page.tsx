import { RequestItem } from '@/components/app/requests/request-item'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Indicator } from '@/components/display/indicator'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { Search, Settings2 } from 'lucide-react'

export function RequestsArchivedScreen() {
    return (
        <section>
            <Header.Root className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Archived Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">View completed and archived requests. Restore or reference past items as needed.</Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <div className='flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content'>
                <Card.Root>
                    <Card.Header className='gap-1.5'>
                        <div className='flex-1 flex items-center gap-1.5'>
                            <Indicator color='gray' className='size-6' />
                            <Label.sm>Archived Tasks</Label.sm>
                        </div>
                        <div className='flex items-center gap-1.5'>
                            <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-sm' />
                            <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className='space-y-1.5'>
                        <RequestItem />
                        <RequestItem />
                        <RequestItem />
                    </Card.Content>
                </Card.Root>
            </div>
        </section>
    )
}