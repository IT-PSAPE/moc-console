import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { Button } from '../../../../../../packages/ui/src/components/controls/button'
import { KanbanBoard } from '../../../../../../packages/ui/src/components/display/kanban-board'

describe('KanbanBoard pointer enhancement', () => {
    test.each([false, true])('preserves the child keyboard control without an inert outer tab stop (disabled=%s)', (disabled) => {
        const markup = renderToStaticMarkup(
            <KanbanBoard>
                <KanbanBoard.Item id="camera" disabled={disabled}>
                    <Button aria-label="Open camera details">Camera</Button>
                </KanbanBoard.Item>
            </KanbanBoard>,
        )

        expect(markup).toContain('aria-label="Open camera details"')
        expect(markup.match(/<button\b/g)).toHaveLength(1)
        expect(markup).not.toMatch(/<div[^>]*role="button"/)
        expect(markup).not.toMatch(/<div[^>]*tabindex="0"/)
        expect(markup).not.toContain('aria-roledescription="draggable"')
    })
})
