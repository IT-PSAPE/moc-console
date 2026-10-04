import { describe, expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ColorSchemeImage } from '../../../../../../packages/ui/src/components/display/color-scheme-image'

describe('ColorSchemeImage', () => {
  test('uses the dark image for dark color schemes and keeps a light fallback', () => {
    const markup = renderToStaticMarkup(
      <ColorSchemeImage lightSrc="/light/image.avif" darkSrc="/dark/image.avif" alt="Example" />,
    )

    expect(markup).toContain('media="(prefers-color-scheme: dark)"')
    expect(markup).toContain('srcSet="/dark/image.avif"')
    expect(markup).toContain('src="/light/image.avif"')
    expect(markup).toContain('alt="Example"')
  })
})
