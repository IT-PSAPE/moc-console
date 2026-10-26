import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { RequestBasicInfo } from '../../../../../../apps/request/src/features/components/request-basic-info'
import { OverlayProvider } from '../../../../../../packages/ui/src/components/overlays/overlay-provider'
import type { RequestCategoryOption } from '../../../../../../apps/request/src/types/tracking'

const data = {
  title: '', requestedBy: '', dueDate: '', category: '', who: '', what: '',
  whenText: '', whereText: '', why: '', how: '', flow: '',
}

function renderRequestBasicInfo(categoryUnavailable: boolean, categoryPlaceholder: string, categories: RequestCategoryOption[] = []) {
  return renderToStaticMarkup(createElement(OverlayProvider, null, createElement(RequestBasicInfo, {
    data,
    categories,
    categoryUnavailable,
    categoryPlaceholder,
    onChange: () => undefined,
    errors: {},
  })))
}

describe('RequestBasicInfo category field', () => {
  test('shows a loading placeholder and disables the empty category selector', () => {
    const markup = renderRequestBasicInfo(true, 'Loading categories…')

    expect(markup).toContain('Loading categories…')
    expect(markup).toContain('disabled=""')
  })

  test('shows an unavailable placeholder and disables the selector after a category error', () => {
    const markup = renderRequestBasicInfo(true, 'Categories unavailable')

    expect(markup).toContain('Categories unavailable')
    expect(markup).toContain('disabled=""')
  })

  test('offers the normal category prompt when options are available', () => {
    const markup = renderRequestBasicInfo(false, 'Select a category', [{ value: 'general', label: 'General' }])

    expect(markup).toContain('Select a category')
    expect(markup).not.toContain('disabled=""')
  })
})
