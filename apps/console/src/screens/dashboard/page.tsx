import { BookingItem } from '@/features/equipment/booking-item'
import { RequestItem } from '@/features/requests/request-item'
import { GroupedList } from '@moc/ui/components/display/grouped-list'
import { Indicator } from '@moc/ui/components/display/indicator'
import { Decision } from '@moc/ui/components/display/decision'
import { Label } from '@moc/ui/components/display/text'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { Page } from '@moc/ui/components/layout/page'
import { Section } from '@moc/ui/components/display/section'
import type { Booking } from '@moc/types/equipment'
import type { Request } from '@moc/types/requests'
import { CalendarCheck, FileText } from 'lucide-react'
import { useDashboard } from './use-dashboard'

export function DashboardScreen() {
    const { state, meta } = useDashboard()

    function renderRequest(request: Request) {
        return <RequestItem key={request.id} request={request} />
    }

    function renderBooking(booking: Booking) {
        return <BookingItem key={booking.id} booking={booking} />
    }

    return (
        <Page>
            <Page.Header>
                <Page.Heading>
                    <Page.Title>Dashboard</Page.Title>
                </Page.Heading>
            </Page.Header>

            <Page.Content className="flex flex-col gap-6">
                <Section>
                    <Section.Header title="Requests" />
                    <Section.Body>
                        <GroupedList>
                            <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator color="red" className="size-6" />
                                    <Label.sm>Overdue</Label.sm>
                                </GroupedList.Header>
                                <GroupedList.Content>
                                    <Decision value={state.overdueRequests} loading={meta.isLoadingRequests}>
                                        <Decision.Loading><LoadingSpinner className="py-6" /></Decision.Loading>
                                        <Decision.Empty><EmptyState icon={<FileText />} title="No overdue requests" /></Decision.Empty>
                                        <Decision.Data>{state.overdueRequests.map(renderRequest)}</Decision.Data>
                                    </Decision>
                                </GroupedList.Content>
                            </GroupedList.Group>

                            <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator className="size-6" />
                                    <Label.sm>Upcoming</Label.sm>
                                </GroupedList.Header>
                                <GroupedList.Content>
                                    <Decision value={state.upcomingRequests} loading={meta.isLoadingRequests}>
                                        <Decision.Loading><LoadingSpinner className="py-6" /></Decision.Loading>
                                        <Decision.Empty><EmptyState icon={<FileText />} title="No upcoming requests" /></Decision.Empty>
                                        <Decision.Data>{state.upcomingRequests.map(renderRequest)}</Decision.Data>
                                    </Decision>
                                </GroupedList.Content>
                            </GroupedList.Group>
                        </GroupedList>
                    </Section.Body>
                </Section>

                <Section>
                    <Section.Header title="Bookings" />
                    <Section.Body>
                        <GroupedList>
                            <GroupedList.Group>
                                <GroupedList.Header>
                                    <Indicator color="blue" className="size-6" />
                                    <Label.sm>Upcoming</Label.sm>
                                </GroupedList.Header>
                                <GroupedList.Content>
                                    <Decision value={state.upcomingBookings} loading={meta.isLoadingBookings}>
                                        <Decision.Loading><LoadingSpinner className="py-6" /></Decision.Loading>
                                        <Decision.Empty><EmptyState icon={<CalendarCheck />} title="No upcoming bookings" /></Decision.Empty>
                                        <Decision.Data>{state.upcomingBookings.map(renderBooking)}</Decision.Data>
                                    </Decision>
                                </GroupedList.Content>
                            </GroupedList.Group>
                        </GroupedList>
                    </Section.Body>
                </Section>
            </Page.Content>
        </Page>
    )
}
