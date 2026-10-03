import { toRichHtml } from '@moc/notifications'

const EDITABLE_TAGS = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'footer', 'blockquote', 'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tr', 'th', 'td', 'mark', 'sub', 'sup', 'tg-spoiler', 'span', 'aside', 'details', 'summary', 'colgroup', 'col'])
const TOKEN_RE = /{{\s*(\w+)\s*}}/g

export function unsupportedTemplateTags(source: string): string[] {
    const document = new DOMParser().parseFromString(source, 'text/html')
    return [...new Set([...document.body.querySelectorAll('*')].map(element => element.tagName.toLowerCase()).filter(tag => !EDITABLE_TAGS.has(tag)))]
}

export function templateHasContent(source: string): boolean {
    return Boolean(new DOMParser().parseFromString(source, 'text/html').body.textContent?.trim())
}

export function templateToEditorHtml(source: string): string {
    const document = new DOMParser().parseFromString(toRichHtml(source), 'text/html')
    function replaceTokens(node: globalThis.Node): void {
        if (node.nodeType === 3) {
            const text = node.textContent ?? ''
            const matches = [...text.matchAll(TOKEN_RE)]
            if (!matches.length) return
            const fragment = document.createDocumentFragment()
            let offset = 0
            for (const match of matches) {
                fragment.append(document.createTextNode(text.slice(offset, match.index)))
                const chip = document.createElement('span')
                chip.dataset.variable = match[1]
                chip.textContent = match[1]
                fragment.append(chip)
                offset = match.index + match[0].length
            }
            fragment.append(document.createTextNode(text.slice(offset)))
            node.parentNode?.replaceChild(fragment, node)
            return
        }
        for (const child of [...node.childNodes]) replaceTokens(child)
    }
    replaceTokens(document.body)
    return document.body.innerHTML
}

export function editorHtmlToTemplate(html: string): string {
    const document = new DOMParser().parseFromString(html, 'text/html')
    for (const chip of document.querySelectorAll('[data-variable]')) {
        chip.replaceWith(document.createTextNode(`{{${chip.getAttribute('data-variable') ?? ''}}}`))
    }
    for (const spoiler of document.querySelectorAll('[data-spoiler]')) {
        const replacement = document.createElement('tg-spoiler')
        replacement.append(...spoiler.childNodes)
        spoiler.replaceWith(replacement)
    }
    // Column widths are editor metadata, not Telegram message content.
    for (const metadata of document.querySelectorAll('colgroup, col')) metadata.remove()
    for (const wrapper of document.querySelectorAll('tbody, thead')) wrapper.replaceWith(...wrapper.childNodes)
    // Telegram's cells/list items accept inline text, not editor paragraph wrappers.
    for (const paragraph of document.querySelectorAll('td p, th p, li p, footer p, blockquote p')) {
        if (paragraph.previousElementSibling) paragraph.before(document.createElement('br'))
        paragraph.replaceWith(...paragraph.childNodes)
    }
    for (const element of document.querySelectorAll('*')) {
        for (const attribute of [...element.attributes]) {
            if (!['href', 'colspan', 'rowspan', 'start', 'expandable'].includes(attribute.name) && !(element.tagName === 'CODE' && attribute.name === 'class' && /^language-[\w-]+$/.test(attribute.value))) element.removeAttribute(attribute.name)
        }
    }
    return [...document.body.childNodes].map(serializeSourceBlock).filter(Boolean).join('\n\n')
}

function serializeSourceBlock(node: globalThis.Node): string {
    if (node.nodeType !== 1) return node.textContent?.trim() ?? ''
    const element = node as HTMLElement
    if (element.tagName === 'P' && element.innerHTML) return element.innerHTML.replace(/<br\s*\/?\s*>/gi, '\n')
    return element.outerHTML
}
