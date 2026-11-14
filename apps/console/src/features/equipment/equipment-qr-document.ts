import type { Equipment } from '@moc/types/equipment'

type EquipmentIdentity = Pick<Equipment, 'name' | 'serialNumber'>

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

function fileSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'equipment'
}

export function equipmentQrFileName({ name, serialNumber }: EquipmentIdentity): string {
  return `${fileSlug(name)}-${fileSlug(serialNumber)}-qr.png`
}

export function equipmentQrDocument({ name, serialNumber }: EquipmentIdentity, imageUrl: string): string {
  const safeName = escapeHtml(name)
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    `<title>${safeName}</title>` +
    '<style>' +
    'body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
    'min-height:100vh;font-family:system-ui,-apple-system,sans-serif;}' +
    'img{width:280px;height:280px;}h1{font-size:18px;margin:16px 0 4px;text-align:center;}' +
    'p{margin:0;color:#555;font-size:14px;}' +
    '</style></head><body>' +
    `<img src="${escapeHtml(imageUrl)}" alt="${safeName} QR code" width="280" height="280">` +
    `<h1>${safeName}</h1><p>${escapeHtml(serialNumber)}</p></body></html>`
}
