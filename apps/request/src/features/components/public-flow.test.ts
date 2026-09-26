import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PublicFlow } from './public-flow'

describe('PublicFlow', () => {
  test('keeps the default flow wide and exposes an explicit narrow composition', () => {
    const wideMarkup = renderToStaticMarkup(createElement(PublicFlow, null, 'Wide flow'))
    const narrowMarkup = renderToStaticMarkup(createElement(PublicFlow.Narrow, { as: 'form', action: '/submit', noValidate: true }, 'Narrow flow'))

    expect(wideMarkup).toContain('max-w-content')
    expect(narrowMarkup).toStartWith('<form')
    expect(narrowMarkup).toContain('action="/submit"')
    expect(narrowMarkup).toContain('noValidate=""')
    expect(narrowMarkup).toContain('max-w-2xl')
    expect(narrowMarkup).not.toContain('max-w-content')
  })
})
