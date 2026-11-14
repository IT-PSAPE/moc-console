import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

type Rgb = readonly [number, number, number]
type Colors = Map<string, Rgb>

const css = readFileSync(new URL('../../../../packages/ui/src/index.css', import.meta.url), 'utf8')
const [lightCss, darkCss] = css.split('/* DARK MODE OVERRIDES */')

function readColors(source: string): Colors {
  const colors: Colors = new Map()
  for (const match of source.matchAll(/--color-([\w-]+):\s*#([\da-f]{6})FF;/gi)) {
    const hex = match[2]
    colors.set(match[1], [Number.parseInt(hex.slice(0, 2), 16), Number.parseInt(hex.slice(2, 4), 16), Number.parseInt(hex.slice(4, 6), 16)])
  }
  return colors
}

function color(colors: Colors, name: string): Rgb {
  const value = colors.get(name)
  if (!value) throw new Error(`Missing semantic color ${name}`)
  return value
}

function luminance(rgb: Rgb): number {
  const channels = rgb.map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: Rgb, background: Rgb): number {
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

function composite(foreground: Rgb, background: Rgb, opacity: number): Rgb {
  return [
    foreground[0] * opacity + background[0] * (1 - opacity),
    foreground[1] * opacity + background[1] * (1 - opacity),
    foreground[2] * opacity + background[2] * (1 - opacity),
  ]
}

const lightColors = readColors(lightCss)
const darkColors = new Map([...lightColors, ...readColors(darkCss)])
const neutralSurfaces = ['background-primary', 'background-secondary', 'background-tertiary']
const statusPairs = [
  ['text-brand', 'background-brand'],
  ['text-error', 'background-error'],
  ['text-warning', 'background-warning'],
  ['text-success', 'background-success'],
  ['utility-blue-700', 'utility-blue-50'],
  ['utility-yellow-700', 'utility-yellow-50'],
  ['utility-purple-700', 'utility-purple-50'],
] as const

for (const [theme, colors] of [['light', lightColors], ['dark', darkColors]] as const) {
  describe(`${theme} semantic color contrast`, () => {
    test('normal text remains readable on neutral and semantic surfaces', () => {
      for (const surface of neutralSurfaces) {
        for (const foreground of ['text-primary', 'text-secondary', 'text-tertiary', 'text-quaternary', 'text-brand', 'text-error', 'text-warning', 'text-success']) {
          expect(contrast(color(colors, foreground), color(colors, surface)), `${foreground} on ${surface}`).toBeGreaterThanOrEqual(4.5)
        }
      }
      for (const [foreground, background] of statusPairs) {
        expect(contrast(color(colors, foreground), color(colors, background)), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    })

    test('solid buttons retain readable labels in resting and hover states', () => {
      for (const solid of ['background-brand_solid', 'background-error_solid']) {
        expect(contrast(color(colors, 'text-on-brand'), color(colors, solid)), solid).toBeGreaterThanOrEqual(4.5)
        for (const surface of neutralSurfaces) {
          const hover = composite(color(colors, solid), color(colors, surface), 0.9)
          expect(contrast(color(colors, 'text-on-brand'), hover), `${solid} hover on ${surface}`).toBeGreaterThanOrEqual(4.5)
        }
      }
    })

    test('control edges and focus indicators remain distinguishable', () => {
      for (const surface of neutralSurfaces) {
        for (const edge of ['border-primary', 'border-brand']) {
          expect(contrast(color(colors, edge), color(colors, surface)), `${edge} on ${surface}`).toBeGreaterThanOrEqual(3)
        }
      }
    })
  })
}
