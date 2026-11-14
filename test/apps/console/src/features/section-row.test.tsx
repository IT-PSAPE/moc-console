import { renderToStaticMarkup } from 'react-dom/server'
import { DndContext } from '@dnd-kit/core'
import { expect, test, vi } from 'vitest'
import { Accordion } from '@moc/ui/components/display/accordion'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import { SectionRow } from '../../../../../apps/console/src/features/checklists/section-row'

test('checklist section collapse and rename render as separate named controls', () => {
  const markup = renderToStaticMarkup(
    <OverlayProvider><DndContext>
      <Accordion type="multiple" defaultValue={['section-1']}>
        <SectionRow
          section={{ id: 'section-1', name: 'Lighting', items: [] }}
          onToggle={vi.fn()}
          onAddItem={vi.fn()}
          onRenameItem={vi.fn()}
          onDeleteItem={vi.fn()}
          onRenameSection={vi.fn()}
          onDeleteSection={vi.fn()}
          activeItemId={null}
          overItemId={null}
          isAddingItem={false}
          onRequestAddItem={vi.fn()}
          onDismissAdd={vi.fn()}
        />
      </Accordion>
    </DndContext></OverlayProvider>,
  )

  expect(markup).toContain('aria-label="Toggle section Lighting"')
  expect(markup).toContain('aria-label="Edit Section name: Lighting"')
  expect(markup).toContain('aria-expanded="true"')

  let buttonDepth = 0
  for (const match of markup.matchAll(/<\/?button\b[^>]*>/g)) {
    buttonDepth += match[0].startsWith('</') ? -1 : 1
    expect(buttonDepth, 'interactive controls must not be nested inside a button').toBeLessThanOrEqual(1)
  }
  expect(buttonDepth).toBe(0)
})
