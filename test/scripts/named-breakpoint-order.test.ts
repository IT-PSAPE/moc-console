import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { compile, optimize } from '@tailwindcss/node'
import postcss from 'postcss'
import { beforeAll, describe, expect, test } from 'vitest'
import { namedBreakpointOrder } from '../../scripts/named-breakpoint-order'

const base = fileURLToPath(new URL('../../packages/ui/src/', import.meta.url))
let generated: string
let stylesheet: string

beforeAll(async () => {
  stylesheet = await readFile(`${base}/index.css`, 'utf8')
  const compiler = await compile(stylesheet, { base, onDependency() {} })
  generated = compiler.build([
    'p-8', 'desktop:p-7', 'tablet:p-6', 'landscape:p-4', 'portrait:p-2',
    'landscape:hover:p-3', 'landscape:focus:p-5',
    'sm:p-1', 'md:p-1', 'lg:p-1', 'xl:p-1', '2xl:p-1', 'mobile:p-1',
  ])
})

function assertDescendingOrder(css: string): void {
  const positions = ['.p-8', '.desktop\\:p-7', '.tablet\\:p-6', '.landscape\\:p-4', '.portrait\\:p-2'].map(selector => css.indexOf(selector))
  expect(positions.every(position => position >= 0)).toBe(true)
  expect(positions).toEqual([...positions].sort((first, second) => first - second))
}

describe('named desktop-first breakpoints', () => {
  test('keeps the shared breakpoint foundation explicit instead of falling back to orientation variants', () => {
    expect(stylesheet).toMatch(/--breakpoint-\*:\s*initial\s*;/)
    expect(stylesheet).not.toContain('--breakpoint-mobile')
    expect(stylesheet).toMatch(/@custom-variant desktop\s*\(@media\s*\(width\s*>=\s*0rem\)\)\s*;/)
    expect(stylesheet).toMatch(/@custom-variant tablet\s*\(@media\s*\(width\s*<\s*62rem\)\)\s*;/)
    expect(stylesheet).toMatch(/@custom-variant landscape\s*\(@media\s*\(width\s*<\s*48rem\)\)\s*;/)
    expect(stylesheet).toMatch(/@custom-variant portrait\s*\(@media\s*\(width\s*<\s*30rem\)\)\s*;/)
  })

  test('orders real Tailwind output from desktop to portrait in development', async () => {
    const result = await postcss([namedBreakpointOrder()]).process(generated, { from: undefined })
    assertDescendingOrder(result.css)
    expect(result.css).toContain('@media (width >= 0rem)')
    expect(result.css).toContain('@media (width < 62rem)')
    expect(result.css).toContain('@media (width < 48rem)')
    expect(result.css).toContain('@media (width < 30rem)')
    expect(result.css).not.toContain('(orientation:')
    for (const prefix of ['sm', 'md', 'lg', 'xl', '2xl', 'mobile']) expect(result.css).not.toContain(`.${prefix}\\:p-1`)
  })

  test('retains the descending cascade after Tailwind production optimization', async () => {
    const optimized = optimize(generated, { minify: true }).code
    const result = await postcss([namedBreakpointOrder()]).process(optimized, { from: undefined })
    assertDescendingOrder(result.css)
    expect(result.css.indexOf('.landscape\\:hover\\:p-3')).toBeLessThan(result.css.indexOf('.landscape\\:focus\\:p-5'))
  })

  test('keeps nonresponsive rules and modifier ordering stable and leaves other layers untouched', async () => {
    const css = '@layer components{.portrait\\:p-2{padding:2px}.tablet\\:p-6{padding:6px}}@layer utilities{.ordinary{color:red}.portrait\\:p-2{padding:2px}.hover\\:p-1:hover{padding:1px}.landscape\\:hover\\:p-3:hover{padding:3px}.landscape\\:focus\\:p-5:focus{padding:5px}.tablet\\:p-6{padding:6px}.last{color:blue}}'
    const result = await postcss([namedBreakpointOrder()]).process(css, { from: undefined })
    expect(result.css).toContain('@layer components{.portrait\\:p-2{padding:2px}.tablet\\:p-6{padding:6px}}')
    const layer = result.root.nodes[1]
    expect(layer.type).toBe('atrule')
    if (layer.type !== 'atrule') return
    expect(layer.nodes?.map(node => node.type === 'rule' ? node.selector : '')).toEqual([
      '.ordinary', '.hover\\:p-1:hover', '.last', '.tablet\\:p-6',
      '.landscape\\:hover\\:p-3:hover', '.landscape\\:focus\\:p-5:focus', '.portrait\\:p-2',
    ])
  })
})
