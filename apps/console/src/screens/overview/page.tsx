import { Page } from '@moc/ui/components/layout/page'
import { Section } from '@moc/ui/components/display/section'
import { Overview } from '@/features/overview/overview'

export function OverviewPage() {
    return <Overview.Root>
        <Page>
            <Overview.Header />
            <Page.Container>
                <Overview.Banner />
            </Page.Container>
            <Page.Content width="standard" className="pt-8">
                <Section>
                    <Section.Header title="Coming up" actions={<Overview.FilterTrigger />} />
                    <Overview.Agenda />
                </Section>
            </Page.Content>
        </Page>
        <Overview.Filters />
    </Overview.Root>
}
