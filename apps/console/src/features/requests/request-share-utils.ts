import { routes } from '@/screens/console-routes'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

export function buildRequestShareUrl(requestId: string): string {
  return `${window.location.origin}/${routes.requestsDetail.replace(':id', requestId)}`
}

export function buildRequestScreenshotFileName(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

  return `${slug || 'request'}-details.png`
}

export async function captureElementAsPngFile(element: HTMLElement, fileName: string): Promise<File> {
  const rect = element.getBoundingClientRect()
  const width = Math.ceil(rect.width)
  const height = Math.ceil(rect.height)

  if (width === 0 || height === 0) {
    throw new Error('The request details are not visible yet.')
  }

  await document.fonts.ready.catch(() => undefined)

  const wrapper = document.createElement('div')
  wrapper.setAttribute('xmlns', XHTML_NAMESPACE)
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.boxSizing = 'border-box'
  wrapper.appendChild(cloneElementTree(element))

  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.setAttribute('xmlns', SVG_NAMESPACE)
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)

  const foreignObject = document.createElementNS(SVG_NAMESPACE, 'foreignObject')
  foreignObject.setAttribute('width', '100%')
  foreignObject.setAttribute('height', '100%')
  foreignObject.appendChild(wrapper)
  svg.appendChild(foreignObject)

  const serializedSvg = new XMLSerializer().serializeToString(svg)
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`)
  const scale = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width * scale))
  canvas.height = Math.max(1, Math.floor(height * scale))

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('The screenshot canvas could not be created.')
  }

  context.scale(scale, scale)
  context.fillStyle = getBackgroundColor(element)
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(canvas)
  return new File([blob], fileName, { type: 'image/png' })
}

function cloneElementTree(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  syncElementTree(source, clone)
  return clone
}

function syncElementTree(source: Element, clone: Element) {
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    copyComputedStyles(source, clone)
    syncFormValues(source, clone)
  }

  const sourceChildren = Array.from(source.children)
  const cloneChildren = Array.from(clone.children)

  sourceChildren.forEach((sourceChild, index) => {
    const cloneChild = cloneChildren[index]
    if (cloneChild) {
      syncElementTree(sourceChild, cloneChild)
    }
  })
}

function copyComputedStyles(source: HTMLElement, clone: HTMLElement) {
  const computed = window.getComputedStyle(source)
  const cssText = Array.from(computed)
    .map((property) => `${property}:${computed.getPropertyValue(property)};`)
    .join('')

  clone.setAttribute('style', cssText)
}

function syncFormValues(source: HTMLElement, clone: HTMLElement) {
  if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
    clone.value = source.value
    clone.setAttribute('value', source.value)
    clone.checked = source.checked
    return
  }

  if (source instanceof HTMLTextAreaElement && clone instanceof HTMLTextAreaElement) {
    clone.value = source.value
    clone.textContent = source.value
    return
  }

  if (source instanceof HTMLSelectElement && clone instanceof HTMLSelectElement) {
    clone.value = source.value
  }
}

function getBackgroundColor(element: HTMLElement): string {
  let current: HTMLElement | null = element

  while (current) {
    const color = window.getComputedStyle(current).backgroundColor
    if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
      return color
    }
    current = current.parentElement
  }

  return window.getComputedStyle(document.body).backgroundColor || '#ffffff'
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error('The request screenshot could not be generated.'))
    }, 'image/png')
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The request screenshot could not be rendered.'))
    image.src = src
  })
}
