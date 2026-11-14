import type { HTMLAttributes, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test, vi } from 'vitest'

vi.mock('../../../../../../packages/ui/src/hooks/use-is-landscape', () => ({ useIsLandscape: () => true }))
// Keep the mobile branch inspectable in Node; the browser smoke verifies the
// real Base UI portal and dialog. This checks SplitPanel's labeling contract.
vi.mock('../../../../../../packages/ui/src/components/overlays/drawer', () => {
    function ServerDrawer({ children }: { children: ReactNode }) {
        return <>{children}</>
    }
    function ServerPanel({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
        return <div role="dialog" {...props}>{children}</div>
    }
    function ServerBackdrop() { return null }
    return { Drawer: Object.assign(ServerDrawer, { Portal: ServerDrawer, Panel: ServerPanel, Backdrop: ServerBackdrop }) }
})

import { SplitPanel } from '../../../../../../packages/ui/src/components/layout/split-panel'
import { OverlayProvider } from '../../../../../../packages/ui/src/components/overlays/overlay-provider'

test('forwards the detail region name to its mobile dialog panel', () => {
    const markup = renderToStaticMarkup(
        <OverlayProvider>
            <SplitPanel detailLabel="Equipment details" open onOpenChange={vi.fn()} storageKey={null}>
                <SplitPanel.Primary>Equipment collection</SplitPanel.Primary>
                <SplitPanel.Detail>Equipment information</SplitPanel.Detail>
            </SplitPanel>
        </OverlayProvider>,
    )

    expect(markup).toMatch(/role="dialog"[^>]*aria-label="Equipment details"/)
    expect(markup).toContain('Equipment information')
})
