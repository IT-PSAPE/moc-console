import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { useScheduledMessageBodyContext } from './scheduled-message-body-context'

export function ScheduledMessageBodyViewSwitch() {
    const { state, actions } = useScheduledMessageBodyContext()
    return <SegmentedControl value={state.view} onValueChange={actions.changeView} className="ml-auto flex-none">
        <SegmentedControl.Item value="editor">Editor</SegmentedControl.Item>
        <SegmentedControl.Item value="preview">Preview</SegmentedControl.Item>
    </SegmentedControl>
}
