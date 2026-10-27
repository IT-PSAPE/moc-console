import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Button } from '../../controls/button'
import { Label } from '../../display/text'
import { FormField } from '../form-field'
import { Input } from '../input'
import { Popover } from '../../overlays/popover'
import { useRichTextDateTimeNode } from './use-rich-text-date-time-node'

export function RichTextDateTimeView(props: NodeViewProps) {
    const { state, actions, meta } = useRichTextDateTimeNode(props)
    return <NodeViewWrapper
        as="span"
        contentEditable={false}
        data-rich-text-date-time={state.kind}
        data-value={state.value}
        className="inline-flex align-baseline"
    >
        <Popover open={state.pickerOpen} onOpenChange={actions.changePickerOpen}>
            <Popover.Trigger>
                <Button.Unstyled
                    type="button"
                    aria-label={'Edit ' + state.label.toLowerCase() + ' chip: ' + state.value}
                    aria-haspopup="dialog"
                    disabled={!meta.editable}
                    onMouseDown={actions.preserveEditorSelection}
                    className="rich-text-date-time-chip inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline text-xs font-medium text-brand outline outline-1 outline-border-brand/30 hover:bg-tertiary focus-visible:outline-2 disabled:cursor-default"
                >
                    <meta.Icon className="size-3" aria-hidden="true" />
                    <Label.xs className="text-inherit">{state.value}</Label.xs>
                </Button.Unstyled>
            </Popover.Trigger>
            <Popover.Panel className="w-64">
                <Popover.Content>
                    <FormField label={state.label} htmlFor={state.inputId}>
                        <Input
                            id={state.inputId}
                            aria-label={state.label}
                            type={state.kind}
                            value={state.value}
                            onChange={actions.changeValue}
                        />
                    </FormField>
                </Popover.Content>
            </Popover.Panel>
        </Popover>
    </NodeViewWrapper>
}
