import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { SegmentedProgress } from './segmented-progress'

describe('SegmentedProgress', () => {
  test('marks the current and previous segments as reached', () => {
    const markup = renderToStaticMarkup(<SegmentedProgress aria-label="Submission progress" max={4} value={2} />)

    expect(markup).toContain('aria-valuemax="4"')
    expect(markup).toContain('aria-valuenow="2"')
    expect(markup.match(/bg-brand_solid/g)).toHaveLength(2)
    expect(markup.match(/bg-quaternary/g)).toHaveLength(2)
  })
})
