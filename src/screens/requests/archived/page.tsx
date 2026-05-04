import { RequestItem } from '@/features/requests/request-item'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Indicator } from '@/components/display/indicator'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Input } from '@/components/form/input'
import { Archive, Search, Settings2 } from 'lucide-react'
import { useEffect } from 'react'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { Drawer } from '@/components/overlays/drawer'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'
import { useRequestFilters } from '@/features/requests/use-request-filters'
import { useRequests } from '@/features/requests/request-provider'

export function RequestsArchivedScreen() {
    const { state: { archivedRequests: requests, isLoadingArchived }, actions: { loadArchivedRequests } } = useRequests()

    useEffect(() => {
        loadArchivedRequests()
    }, [loadArchivedRequests])

    const requestFilters = useRequestFilters(requests);
    const { filtered, setSearch, filters: state } = requestFilters;

    return (
        <section>
            <Header className='p-4 pt-8 mx-auto max-w-content'>
                <Header.Lead className='gap-2'>
                    <Title.h6>Archived Requests</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">View completed and archived requests. Restore or reference past items as needed.</Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className='flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content'>
                <Card>
                    <Card.Header className='gap-1.5'>
                        <div className='flex-1 flex items-center gap-1.5'>
                            <Indicator color='gray' className='size-6' />
                            <Label.sm>Archived Tasks</Label.sm>
                        </div>
                        <div className='flex items-center gap-1.5 max-mobile:w-full'>
                            <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-md' value={state.search} onChange={(e) => setSearch(e.target.value)} />
                            <Drawer>
                                <Drawer.Trigger>
                                    <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                                </Drawer.Trigger>
                                <RequestFilterDrawer filters={requestFilters} />
                            </Drawer>
                        </div>
                    </Card.Header>
                    <Card.Content ghost>
                        {isLoadingArchived ? (
                            <div className="flex justify-center py-8">
                                <Spinner />
                            </div>
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                icon={<Archive />}
                                title="No archived requests"
                                description="Archived requests will appear here."
                                className="py-8"
                            />
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                {filtered.map((r) => (
                                    <RequestItem key={r.id} request={r} />
                                ))}
                            </div>
                        )}
                    </Card.Content>
                </Card>
            </div>
        </section>
    )
}
