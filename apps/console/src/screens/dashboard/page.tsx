import { Card } from '@moc/ui/components/display/card'
import { Button } from '@moc/ui/components/controls/button'
import { Label } from '@moc/ui/components/display/text'
import { Page } from '@moc/ui/components/layout/page'
import { Indicator } from '@moc/ui/components/display/indicator'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RequestItem } from '@/features/requests/request-item'
import type { Request } from '@moc/types/requests'
import { Link } from 'react-router-dom'
import { routes } from '@/screens/console-routes'
import {
    ArrowRight,
    Calendar,
} from 'lucide-react'
import { Decision } from '@moc/ui/components/display/decision';
import { EmptyState } from '@moc/ui/components/feedback/empty-state';
import { useDashboard } from './use-dashboard';

export function DashboardScreen() {
    const { state, meta } = useDashboard()

    function renderRequest(request: Request) {
        return <RequestItem key={request.id} request={request} />
    }

    return (
        <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Dashboard</Page.Title>
                </Page.Heading>
                <Page.Actions>
                    <Button.Link variant="secondary" icon={<ArrowRight />} iconPosition="trailing" render={<Link to={`/${routes.requests}`} />}>All requests</Button.Link>
                </Page.Actions>
            </Page.Header>

            <Page.Content className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Overdue requests */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <Indicator color='red' className='size-6' />
                            <Label.sm>Overdue requests</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={state.overdueRequests} loading={meta.isLoading}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Calendar />}
                                    title="No overdue requests"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {state.overdueRequests.map(renderRequest)}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                {/* Upcoming requests */}
                <Card>
                    <Card.Header className='gap-1.5 justify-between' tight>
                        <div className="flex items-center gap-1.5">
                            <Indicator className='size-6' />
                            <Label.sm>Upcoming requests</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className='flex flex-col gap-1.5'>
                        <Decision value={state.upcomingRequests} loading={meta.isLoading}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Calendar />}
                                    title="No upcoming requests"
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {state.upcomingRequests.map(renderRequest)}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

            </Page.Content>
        </Page>
    )
}
