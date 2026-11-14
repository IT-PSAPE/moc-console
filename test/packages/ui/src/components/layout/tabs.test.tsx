import { describe, expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Tabs } from '../../../../../../packages/ui/src/components/layout/tabs'

describe('Tabs accessibility and composition', () => {
    test('preserves labels and attributes on every composed part', () => {
        const markup = renderToStaticMarkup(
            <Tabs defaultTab="details" aria-describedby="tabs-help" id="record-tabs">
                <Tabs.List aria-label="Record information">
                    <Tabs.Tab value="details" id="details-tab" aria-label="Record details">Details</Tabs.Tab>
                    <Tabs.Tab value="history" disabled>History</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panels id="record-panels">
                    <Tabs.Panel value="details" id="details-panel" aria-describedby="details-help">Record</Tabs.Panel>
                </Tabs.Panels>
            </Tabs>,
        )

        expect(markup).toContain('id="record-tabs"')
        expect(markup).toContain('aria-describedby="tabs-help"')
        expect(markup).toContain('aria-label="Record information"')
        expect(markup).toContain('id="details-tab"')
        expect(markup).toContain('aria-label="Record details"')
        expect(markup).toContain('id="record-panels"')
        expect(markup).toContain('id="details-panel"')
        expect(markup).toContain('aria-describedby="details-help"')
        expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>History<\/button>/)
    })

    test('allows keeping inactive panels mounted for form state', () => {
        const markup = renderToStaticMarkup(
            <Tabs defaultTab="details">
                <Tabs.List><Tabs.Tab value="details">Details</Tabs.Tab><Tabs.Tab value="draft">Draft</Tabs.Tab></Tabs.List>
                <Tabs.Panel value="details">Record</Tabs.Panel>
                <Tabs.Panel value="draft" keepMounted><input aria-label="Draft title" defaultValue="Unsaved title" /></Tabs.Panel>
            </Tabs>,
        )

        expect(markup).toContain('hidden=""')
        expect(markup).toContain('aria-label="Draft title"')
        expect(markup).toContain('value="Unsaved title"')
    })
})
