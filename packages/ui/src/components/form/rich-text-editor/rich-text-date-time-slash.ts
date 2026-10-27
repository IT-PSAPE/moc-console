import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import {
    currentRichTextDateTimeValue,
    filterRichTextDateTimeSlashCommands,
    matchRichTextDateTimeSlashCommand,
    type RichTextDateTimeKind,
} from './rich-text-date-time'

export type RichTextDateTimeSlashState = {
    enabled: boolean
    active: boolean
    from: number
    to: number
    query: string
    selectedIndex: number
    dismissed: boolean
}

type SlashCommandMeta = {
    enabled?: boolean
    dismiss?: boolean
    selectedIndex?: number
}

type RichTextDateTimeSlashOptions = {
    timeZone?: string
}

export const richTextDateTimeSlashKey = new PluginKey<RichTextDateTimeSlashState>('richTextDateTimeSlash')

export const inactiveRichTextDateTimeSlashState: RichTextDateTimeSlashState = {
    enabled: false,
    active: false,
    from: 0,
    to: 0,
    query: '',
    selectedIndex: 0,
    dismissed: false,
}

function findSlashCommand(state: EditorState): RichTextDateTimeSlashState {
    const { selection } = state
    if (!selection.empty || selection.$from.parent.type.spec.code || selection.$from.marks().some(mark => mark.type.name === 'code')) {
        return { ...inactiveRichTextDateTimeSlashState, enabled: true }
    }
    const parent = selection.$from.parent
    if (!parent.isTextblock) return { ...inactiveRichTextDateTimeSlashState, enabled: true }
    const textBeforeCursor = parent.textBetween(0, selection.$from.parentOffset, undefined, '\ufffc')
    const match = matchRichTextDateTimeSlashCommand(textBeforeCursor)
    if (!match || !filterRichTextDateTimeSlashCommands(match.query).length) return { ...inactiveRichTextDateTimeSlashState, enabled: true }
    return {
        enabled: true,
        active: true,
        from: selection.$from.start() + match.start,
        to: selection.from,
        query: match.query,
        selectedIndex: 0,
        dismissed: false,
    }
}

function applySlashTransaction(transaction: Transaction, previous: RichTextDateTimeSlashState, _oldState: EditorState, nextState: EditorState): RichTextDateTimeSlashState {
    const meta = transaction.getMeta(richTextDateTimeSlashKey) as SlashCommandMeta | undefined
    if (meta?.enabled === false) return inactiveRichTextDateTimeSlashState
    const enabled = meta?.enabled ?? previous.enabled
    if (!enabled) return inactiveRichTextDateTimeSlashState
    if (meta?.dismiss) return { ...previous, active: false, dismissed: true }
    if (typeof meta?.selectedIndex === 'number' && previous.active) {
        return { ...previous, selectedIndex: Math.max(0, meta.selectedIndex) }
    }
    if (previous.dismissed && !transaction.docChanged && !transaction.selectionSet) return previous
    const next = findSlashCommand(nextState)
    if (!next.active) return next
    return {
        ...next,
        selectedIndex: previous.active && previous.query === next.query ? previous.selectedIndex : 0,
    }
}

function insertDateTime(view: EditorView, from: number, to: number, kind: RichTextDateTimeKind, timeZone?: string): void {
    const nodeType = view.state.schema.nodes.dateTime
    if (!nodeType) return
    const node = nodeType.create({ kind, value: currentRichTextDateTimeValue(kind, new Date(), timeZone), pickerOpen: true })
    const transaction = view.state.tr.replaceWith(from, to, node)
    transaction.setSelection(TextSelection.create(transaction.doc, from + node.nodeSize))
    view.dispatch(transaction.scrollIntoView())
}

export const RichTextDateTimeSlash = Extension.create<RichTextDateTimeSlashOptions>({
    name: 'richTextDateTimeSlash',
    addOptions() {
        return { timeZone: undefined }
    },
    addProseMirrorPlugins() {
        const { timeZone } = this.options
        return [new Plugin<RichTextDateTimeSlashState>({
            key: richTextDateTimeSlashKey,
            state: {
                init: () => inactiveRichTextDateTimeSlashState,
                apply: applySlashTransaction,
            },
            props: {
                handleKeyDown(view, event) {
                    const current = richTextDateTimeSlashKey.getState(view.state)
                    if (!current?.active) return false
                    if (event.key === 'Escape') {
                        view.dispatch(view.state.tr.setMeta(richTextDateTimeSlashKey, { dismiss: true }))
                        return true
                    }
                    const options = filterRichTextDateTimeSlashCommands(current.query)
                    if (!options.length) return false
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                        const direction = event.key === 'ArrowDown' ? 1 : -1
                        const selectedIndex = (current.selectedIndex + direction + options.length) % options.length
                        view.dispatch(view.state.tr.setMeta(richTextDateTimeSlashKey, { selectedIndex }))
                        return true
                    }
                    if (event.key === 'Enter') {
                        const selected = options[current.selectedIndex] ?? options[0]
                        insertDateTime(view, current.from, current.to, selected.kind, timeZone)
                        return true
                    }
                    return false
                },
            },
        })]
    },
})
