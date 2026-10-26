import { expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ItemCommentRow } from '../../../../../../apps/console/src/features/item-discussion/item-comment-row'

test('renders imported content as literal text and makes the exact comment date visible', () => {
    const markup = renderToStaticMarkup(<ItemCommentRow comment={{ id: 'comment', body: '<script>alert("content")</script>\nAnother line', origin: 'Imported from notes', actor: { name: 'Devon', initials: 'D', avatarUrl: null, source: null }, time: { relative: '2 days ago', exact: '24 Oct 2026, 12:43 UTC', clock: '12:43' } }} />)
    expect(markup).toContain('&lt;script&gt;')
    expect(markup).not.toContain('<script>')
    expect(markup).toContain('24 Oct 2026, 12:43 UTC')
    expect(markup).toContain('Imported from notes')
})
