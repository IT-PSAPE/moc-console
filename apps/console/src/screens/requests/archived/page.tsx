import { RequestItem } from '@/features/requests/request-item'
import { Button } from '@moc/ui/components/controls/button'
import { Card } from '@moc/ui/components/display/card'
import { Header } from '@moc/ui/components/display/header'
import { Indicator } from '@moc/ui/components/display/indicator'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { Input } from '@moc/ui/components/form/input'
import { Archive, Search, Settings2 } from 'lucide-react'
import { useEffect } from 'react'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { RequestFilterDrawer } from '@/features/requests/request-filter-drawer'
import { useRequestFilters } from '@/features/requests/use-request-filters'
import { useRequests } from '@/features/requests/request-provider'
import { Decision } from '@moc/ui/components/display/decision';

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

            <Header className='p-4 pt-8 mx-auto max-w-content max-mobile:flex-col max-mobile:gap-2 *:max-mobile:w-full'>
                <Header.Lead className='gap-2 w-full'>

                </Header.Lead>
                <Header.Trail className='gap-2 flex-1 justify-end '>
                    <Input icon={<Search />} placeholder='Search requests...' className='w-full max-w-md' value={state.search} onChange={(e) => setSearch(e.target.value)} />
                    <Drawer>
                        <Drawer.Trigger>
                            <Button icon={<Settings2 />} variant='secondary'>Filter</Button>
                        </Drawer.Trigger>
                        <RequestFilterDrawer filters={requestFilters} />
                    </Drawer>
                </Header.Trail>
            </Header>

            <div className='flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content'>
                <Card>
                    <Card.Header className='gap-1.5'>
                        <Indicator color='gray' className='size-6' />
                        <Label.sm>Archived</Label.sm>
                    </Card.Header>
                    <Card.Content ghost>
                        <Decision value={filtered} loading={isLoadingArchived}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Archive />}
                                    title="No archived requests"
                                    description="Archived requests will appear here."
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {filtered.map((r) => <RequestItem key={r.id} request={r} />)}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>
            </div>
        </section>
    )
}
