import { toRichHtml } from '@moc/notifications'
import {
    isRichTextDateTimeValue,
    RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE,
    RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE,
    type RichTextDateTimeKind,
} from '@moc/ui/components/form/rich-text-editor/rich-text-date-time'

const TOKEN_RE = /{{\s*(date|time):([^{}\s]+)\s*}}/g

function isNativeTableWrapper(element: Element): boolean {
    return element.matches('div.tableWrapper')
        && element.children.length === 1
        && element.firstElementChild?.tagName === 'TABLE'
        && [...element.childNodes].every(node => node.nodeType !== 3 || !node.textContent?.trim())
}

function isRichTextDateTime(kind: string, value: string): kind is RichTextDateTimeKind {
    return (kind === 'date' || kind === 'time') && isRichTextDateTimeValue(kind, value)
}

function replaceBodyTokens(document: Document, node: globalThis.Node): void {
    if (node instanceof Element && ['PRE', 'CODE'].includes(node.tagName)) return
    if (node instanceof Element && node.tagName === 'SPAN' && node.hasAttribute(RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE)) return
    if (node.nodeType === 3) {
        const text = node.textContent ?? ''
        const matches = [...text.matchAll(TOKEN_RE)]
        if (!matches.length) return
        const fragment = document.createDocumentFragment()
        let offset = 0
        for (const match of matches) {
            const kind = match[1]
            const value = match[2]
            const start = match.index ?? 0
            fragment.append(document.createTextNode(text.slice(offset, start)))
            if (isRichTextDateTime(kind, value)) {
                const chip = document.createElement('span')
                chip.setAttribute(RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE, kind)
                chip.setAttribute(RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE, value)
                chip.textContent = (kind === 'date' ? 'Date' : 'Time') + ' · ' + value
                fragment.append(chip)
            } else {
                fragment.append(document.createTextNode(match[0]))
            }
            offset = start + match[0].length
        }
        fragment.append(document.createTextNode(text.slice(offset)))
        node.parentNode?.replaceChild(fragment, node)
        return
    }
    for (const child of [...node.childNodes]) replaceBodyTokens(document, child)
}

function replaceDateTimeChips(document: Document): void {
    for (const chip of document.querySelectorAll('span[data-rich-text-date-time]')) {
        const kind = chip.getAttribute(RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE) ?? ''
        const value = chip.getAttribute(RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE) ?? ''
        if (!isRichTextDateTime(kind, value)) {
            chip.replaceWith(...chip.childNodes)
            continue
        }
        chip.replaceWith(document.createTextNode('{{' + kind + ':' + value + '}}'))
    }
}

function sanitizeEditorHtml(document: Document): void {
    for (const metadata of document.querySelectorAll('colgroup, col')) metadata.remove()
    for (const wrapper of document.querySelectorAll('div.tableWrapper')) {
        if (isNativeTableWrapper(wrapper)) wrapper.replaceWith(...wrapper.childNodes)
    }
    for (const wrapper of document.querySelectorAll('tbody, thead')) wrapper.replaceWith(...wrapper.childNodes)
    for (const paragraph of document.querySelectorAll('td p, th p, li p, blockquote p')) {
        if (paragraph.previousElementSibling) paragraph.before(document.createElement('br'))
        paragraph.replaceWith(...paragraph.childNodes)
    }
    for (const element of document.querySelectorAll('*')) {
        for (const attribute of [...element.attributes]) {
            const isChipAttribute = element.tagName === 'SPAN' && [RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE, RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE].includes(attribute.name)
            const isCodeLanguage = element.tagName === 'CODE' && attribute.name === 'class' && /^language-[\w-]+$/.test(attribute.value)
            if (!['href', 'colspan', 'rowspan', 'start'].includes(attribute.name) && !isCodeLanguage && !isChipAttribute) element.removeAttribute(attribute.name)
        }
    }
}

function serializeSourceBlock(node: globalThis.Node): string {
    if (node.nodeType !== 1) return node.textContent?.trim() ?? ''
    const element = node as HTMLElement
    if (element.tagName === 'P' && element.innerHTML) return element.innerHTML.replace(/<br\s*\/?\s*>/gi, '\n')
    return element.outerHTML
}

export function messageBodyToEditorHtml(source: string): string {
    const sourceDocument = new DOMParser().parseFromString(source, 'text/html')
    for (const wrapper of sourceDocument.querySelectorAll('div.tableWrapper')) {
        if (isNativeTableWrapper(wrapper)) wrapper.replaceWith(...wrapper.childNodes)
    }
    const document = new DOMParser().parseFromString(toRichHtml(sourceDocument.body.innerHTML), 'text/html')
    replaceBodyTokens(document, document.body)
    return document.body.innerHTML
}

export function editorHtmlToMessageBody(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html')
    replaceDateTimeChips(document)
    sanitizeEditorHtml(document)
    return [...document.body.childNodes].map(serializeSourceBlock).filter(Boolean).join('\n\n')
}
