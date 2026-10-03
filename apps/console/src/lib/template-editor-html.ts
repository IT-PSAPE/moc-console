import { toRichHtml } from '@moc/notifications'

const EDITABLE_TAGS = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'blockquote', 'ul', 'ol', 'li', 'table', 'tbody', 'thead', 'tr', 'th', 'td', 'mark', 'sub', 'sup', 'span', 'colgroup', 'col'])
const TOKEN_RE = /{{\s*(\w+)\s*}}/g

function isNativeTableWrapper(element: Element): boolean {
    return element.matches('div.tableWrapper')
        && element.children.length === 1
        && element.firstElementChild?.tagName === 'TABLE'
        && [...element.childNodes].every(node => node.nodeType !== 3 || !node.textContent?.trim())
}

export function unsupportedTemplateTags(source: string): string[] {
    const document = new DOMParser().parseFromString(source, 'text/html')
    const unsupported = [...document.body.querySelectorAll('*')].filter(element => !EDITABLE_TAGS.has(element.tagName.toLowerCase()) && !isNativeTableWrapper(element)).map(element => element.tagName.toLowerCase())
    if (document.querySelector('blockquote[expandable]')) unsupported.push('expandable quote')
    if (document.querySelector('span.tg-spoiler, [data-spoiler]')) unsupported.push('spoiler')
    return [...new Set(unsupported)]
}

export function templateHasContent(source: string): boolean {
    return Boolean(new DOMParser().parseFromString(source, 'text/html').body.textContent?.trim())
}

export function templateToEditorHtml(source: string): string {
    const sourceDocument = new DOMParser().parseFromString(source, 'text/html')
    // Tiptap's table view container is layout metadata, not message content.
    for (const wrapper of sourceDocument.querySelectorAll('div.tableWrapper')) {
        if (isNativeTableWrapper(wrapper)) wrapper.replaceWith(...wrapper.childNodes)
    }
    const document = new DOMParser().parseFromString(toRichHtml(sourceDocument.body.innerHTML), 'text/html')
    function replaceTokens(node: globalThis.Node): void {
        if (node instanceof Element && node.tagName === 'PRE') return
        if (node instanceof Element && node.tagName === 'CODE') {
            const token = /^{{\s*(\w+)\s*}}$/.exec(node.textContent ?? '')
            if (token) {
                node.setAttribute('data-variable', '')
                node.textContent = token[1]
            }
            return
        }
        if (node.nodeType === 3) {
            const text = node.textContent ?? ''
            const matches = [...text.matchAll(TOKEN_RE)]
            if (!matches.length) return
            const fragment = document.createDocumentFragment()
            let offset = 0
            for (const match of matches) {
                fragment.append(document.createTextNode(text.slice(offset, match.index)))
                const variable = document.createElement('code')
                variable.setAttribute('data-variable', '')
                variable.textContent = match[1]
                fragment.append(variable)
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
    for (const variable of document.querySelectorAll('code[data-variable]')) {
        variable.replaceWith(document.createTextNode(`{{${variable.textContent ?? ''}}}`))
    }
    // Column widths are editor metadata, not Telegram message content.
    for (const metadata of document.querySelectorAll('colgroup, col')) metadata.remove()
    for (const wrapper of document.querySelectorAll('tbody, thead')) wrapper.replaceWith(...wrapper.childNodes)
    // Telegram's cells/list items accept inline text, not editor paragraph wrappers.
    for (const paragraph of document.querySelectorAll('td p, th p, li p, blockquote p')) {
        if (paragraph.previousElementSibling) paragraph.before(document.createElement('br'))
        paragraph.replaceWith(...paragraph.childNodes)
    }
    for (const element of document.querySelectorAll('*')) {
        for (const attribute of [...element.attributes]) {
            if (!['href', 'colspan', 'rowspan', 'start'].includes(attribute.name) && !(element.tagName === 'CODE' && attribute.name === 'class' && /^language-[\w-]+$/.test(attribute.value))) element.removeAttribute(attribute.name)
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
