import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { Equipment } from '@moc/types/equipment'
import { HookRuntime, createMockReactModule } from '../../../../broadcast/src/features/test-hook-runtime'

const toast = vi.fn()
const copy = vi.fn()
vi.doMock('react', () => ({ ...React, ...createMockReactModule() }))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast }) }))
vi.doMock('../../../../../../apps/console/src/hooks/use-copy-feedback', () => ({ useCopyFeedback: () => ({ state: { copiedField: null }, actions: { copy } }) }))
const { useEquipmentQr } = await import('../../../../../../apps/console/src/features/equipment/use-equipment-qr')

const equipment = { id: 'equipment-id', name: '<Camera>', serialNumber: 'ABC-001' } as Equipment
const write = vi.fn()
const close = vi.fn()
const print = vi.fn()
const focus = vi.fn()
const popupDocumentClose = vi.fn()
const popupOpen = vi.fn()
let listeners: Record<string, () => void> = {}
const popup = { document: { open: popupOpen, write, close: popupDocumentClose }, focus, print, close, addEventListener: (event: string, listener: () => void) => { listeners[event] = listener }, opener: null }
const open = vi.fn()

function qr(): HookRuntime<Equipment, ReturnType<typeof useEquipmentQr>> {
  const runtime = new HookRuntime(useEquipmentQr)
  runtime.render(equipment).meta.canvasRef.current = { toDataURL: () => 'data:image/png;base64,cXJjb2Rl' } as HTMLCanvasElement
  return runtime
}

beforeEach(() => {
  vi.resetAllMocks()
  listeners = {}
  open.mockReturnValue(popup)
  // document.open resets listeners on a real window too.
  popupOpen.mockImplementation(() => { listeners = {} })
  vi.stubGlobal('window', { open })
})
afterEach(() => vi.unstubAllGlobals())

test('prints after document load with trusted event handlers and closes after printing', () => {
  const runtime = qr()
  runtime.rerender().actions.print()
  expect(print).not.toHaveBeenCalled()
  expect(write.mock.calls[0][0]).not.toContain('<script')
  expect(write.mock.calls[0][0]).toContain('&lt;Camera&gt;')
  expect(popupDocumentClose).toHaveBeenCalledOnce()
  listeners.load()
  expect(focus).toHaveBeenCalledOnce()
  expect(print).toHaveBeenCalledOnce()
  listeners.afterprint()
  expect(close).toHaveBeenCalledOnce()
  runtime.unmount()
  expect(close).toHaveBeenCalledOnce()
})

test('a blocked popup explains how to recover', () => {
  open.mockReturnValue(null)
  const runtime = qr()
  runtime.rerender().actions.print()
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Allow pop-ups to print', variant: 'error' }))
  expect(write).not.toHaveBeenCalled()
  runtime.unmount()
})

test('unmount closes a print popup that has not completed', () => {
  const runtime = qr()
  runtime.rerender().actions.print()
  runtime.unmount()
  expect(close).toHaveBeenCalledOnce()
})


test('a browser print failure closes its popup and offers the download fallback', () => {
  print.mockImplementation(() => { throw new Error('Print unavailable') })
  const runtime = qr()
  runtime.rerender().actions.print()
  listeners.load()
  expect(close).toHaveBeenCalledOnce()
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Could not print the QR code', description: 'Try downloading the image instead.', variant: 'error' }))
  runtime.unmount()
})

test('download exports the current canvas with the equipment filename', () => {
  const link = { href: '', download: '', click: vi.fn() }
  vi.stubGlobal('document', { createElement: () => link })
  const runtime = qr()
  runtime.rerender().actions.download()
  expect(link.href).toBe('data:image/png;base64,cXJjb2Rl')
  expect(link.download).toBe('camera-abc-001-qr.png')
  expect(link.click).toHaveBeenCalledOnce()
  runtime.unmount()
})
