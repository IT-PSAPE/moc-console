import { CalendarDays, Clock3 } from 'lucide-react'
import { Button } from '../../controls/button'
import { Label } from '../../display/text'
import { Popover } from '../../overlays/popover'
import { useRichTextDateTimeSlashMenu } from './use-rich-text-date-time-slash-menu'
import type { RichTextDateTimeSlashCommand } from './rich-text-date-time'

export function RichTextEditorDateTime() {
    const { state, actions } = useRichTextDateTimeSlashMenu()
    const slash = state.slash ?? { active: false, from: 0, to: 0, query: '', selectedIndex: 0, dismissed: false }
    const anchor = state.editor && slash.active ? {
        contextElement: state.editor.view.dom,
        getBoundingClientRect() {
            const rect = state.editor?.view.coordsAtPos(slash.to)
            return rect ? new DOMRect(rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top) : new DOMRect()
        },
    } : undefined

    function renderCommand(command: RichTextDateTimeSlashCommand, index: number) {
        const Icon = command.kind === 'date' ? CalendarDays : Clock3
        const selected = index === slash.selectedIndex
        return <Button.Unstyled
            key={command.kind}
            type="button"
            role="option"
            aria-selected={selected}
            data-index={index}
            data-kind={command.kind}
            onMouseDown={actions.preserveEditorSelection}
            onMouseEnter={actions.highlightCommand}
            onClick={actions.selectCommand}
            className={'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-secondary outline-none focus-visible:bg-secondary ' + (selected ? 'bg-secondary text-primary' : 'hover:bg-secondary')}
        >
            <Icon className="size-4 text-tertiary" aria-hidden="true" />
            <Label.sm className="text-inherit">{command.label}</Label.sm>
            <Label.xs className="ml-auto text-quaternary">{command.command}</Label.xs>
        </Button.Unstyled>
    }

    return <Popover open={slash.active} closeOnEscape={false}>
        <Popover.Panel anchor={anchor} initialFocus={false} className="w-52 p-1" role="listbox" aria-label="Insert date or time">
            {state.commands.map(renderCommand)}
        </Popover.Panel>
    </Popover>
}
