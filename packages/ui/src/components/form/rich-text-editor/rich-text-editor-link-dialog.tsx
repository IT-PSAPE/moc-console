import type { ChangeEvent } from 'react'
import { Modal } from '../../overlays/modal'
import { Input } from '../input'
import { Button } from '../../controls/button'
import { Label } from '../../display/text'
import { useRichTextEditorContext } from './rich-text-editor-context'
export function RichTextEditorLinkDialog() {
    const { state, actions } = useRichTextEditorContext()
    function changeUrl(event: ChangeEvent<HTMLInputElement>): void { actions.setLinkUrl(event.target.value) }
    function changeOpen(open: boolean): void { if (!open) actions.closeLink() }
    return <Modal open={state.linkOpen} onOpenChange={changeOpen}>
        <Modal.Portal><Modal.Backdrop /><Modal.Positioner><Modal.FullScreenPanel className="w-full max-w-md landscape:max-w-none">
            <Modal.Header><Label.md>Edit link</Label.md></Modal.Header>
            <Modal.Content className="px-5 py-4 flex flex-col gap-4"><Input aria-label="Link URL" name="rich-text-link" autoFocus placeholder="https://… or {{linkUrl}}" value={state.linkUrl} onChange={changeUrl} /></Modal.Content>
            <Modal.Footer><Button variant="secondary" onClick={actions.closeLink}>Cancel</Button><Button onClick={actions.applyLink} disabled={!state.linkValid}>Apply link</Button></Modal.Footer>
        </Modal.FullScreenPanel></Modal.Positioner></Modal.Portal>
    </Modal>
}
