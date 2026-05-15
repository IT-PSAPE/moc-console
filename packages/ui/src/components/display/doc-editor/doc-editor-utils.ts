import type { DocEditorBlock } from './doc-editor-types'

function createBlockId() {
    return Math.random().toString(36).slice(2, 9)
}

export function createDocEditorBlock(content = ''): DocEditorBlock {
    return { id: createBlockId(), content }
}

export function moveDocEditorBlock<T>(blocks: T[], from: number, to: number): T[] {
    const next = [...blocks]
    const [block] = next.splice(from, 1)
    next.splice(to, 0, block)
    return next
}

function normalizeDocEditorLines(lines: string[]) {
    if (lines.length === 0) {
        return ['']
    }

    return lines
}

function parseJsonLines(value: string) {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
        return null
    }

    return normalizeDocEditorLines(parsed.map((item) => typeof item === 'string' ? item : String(item ?? '')))
}

function parsePlainTextLines(value: string) {
    if (!value) {
        return ['']
    }

    return normalizeDocEditorLines(value.split(/\r?\n/))
}

export function deserializeDocEditorValue(value?: string | null): DocEditorBlock[] {
    const source = value?.trim() ?? ''

    if (!source) {
        return [createDocEditorBlock()]
    }

    try {
        const lines = parseJsonLines(source)
        if (lines) {
            return lines.map((line) => createDocEditorBlock(line))
        }
    } catch {
        // Fall through to plain text support for older content values.
    }

    return parsePlainTextLines(value ?? '').map((line) => createDocEditorBlock(line))
}

export function serializeDocEditorBlocks(blocks: DocEditorBlock[]) {
    const lines = blocks.map((block) => block.content)
    const hasContent = lines.some((line) => line.trim() !== '')

    if (!hasContent) {
        return ''
    }

    return JSON.stringify(lines)
}

export function normalizeDocEditorValue(value?: string | null) {
    return serializeDocEditorBlocks(deserializeDocEditorValue(value))
}
