import { VariableTextEditorRoot } from './variable-text-editor/variable-text-editor-root'
import { VariableTextEditorViewSwitch } from './variable-text-editor/variable-text-editor-view-switch'
import { VariableTextEditorRich } from './variable-text-editor/variable-text-editor-rich'
import { VariableTextEditorSource } from './variable-text-editor/variable-text-editor-source'
import { VariableTextEditorFormatting } from './variable-text-editor/variable-text-editor-formatting'
import { VariableTextEditorPreview } from './variable-text-editor/variable-text-editor-preview'
import { RichTextEditorToolbar } from './rich-text-editor/rich-text-editor-toolbar'

export const VariableTextEditor = { Root: VariableTextEditorRoot, Toolbar: RichTextEditorToolbar, ViewSwitch: VariableTextEditorViewSwitch, Formatting: VariableTextEditorFormatting, Rich: VariableTextEditorRich, Source: VariableTextEditorSource, Preview: VariableTextEditorPreview }
