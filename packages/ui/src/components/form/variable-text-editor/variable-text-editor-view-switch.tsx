import { SegmentedControl } from '../../controls/segmented-control'
import { useVariableTextEditorContext } from './variable-text-editor-context'
import type { ReactNode } from 'react'

export function VariableTextEditorViewSwitch({ children }: { children?: ReactNode }) {
    const { state, actions } = useVariableTextEditorContext()
    return <SegmentedControl value={state.view} onValueChange={actions.changeView}>
        <SegmentedControl.Item value="editor">Editor</SegmentedControl.Item>
        <SegmentedControl.Item value="source">Source</SegmentedControl.Item>
        {children}
    </SegmentedControl>
}
