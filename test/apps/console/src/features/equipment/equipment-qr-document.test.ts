import { expect, test } from 'vitest'
import { equipmentQrDocument, equipmentQrFileName } from '../../../../../../apps/console/src/features/equipment/equipment-qr-document'

test('QR print labels escape untrusted equipment values and contain no executable markup', () => {
  const html = equipmentQrDocument({ name: '<script>alert("name")</script>', serialNumber: '<img src=x onerror="alert(1)">' }, 'data:image/png;base64,cXJjb2Rl')
  expect(html).toContain('&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;')
  expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  expect(html).not.toContain('<script')
  expect(html).not.toContain('onload=')
  expect(html).not.toContain('<img src=x')
  expect(html).toContain('src="data:image/png;base64,cXJjb2Rl"')
})

test('QR filenames are normalized without path separators', () => {
  expect(equipmentQrFileName({ name: ' Camera / Body ', serialNumber: '../ABC-001' })).toBe('camera-body-abc-001-qr.png')
  expect(equipmentQrFileName({ name: '', serialNumber: '' })).toBe('equipment-equipment-qr.png')
})
