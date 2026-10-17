import type { InlineKeyboardButton } from '@moc/notifications'
import { MessageBubble } from '@moc/ui/components/display/message-bubble/message-bubble'
import { RichTextEditor } from '@moc/ui/components/form/rich-text-editor'
import type { ScheduledMessagePreview } from '../scheduled-message-preview'

type ScheduledTelegramPreviewProps = { preview: ScheduledMessagePreview; sendTime: string }

function ignoreChange(): void { /* This preview cannot edit the draft. */ }

export function ScheduledTelegramPreview({ preview, sendTime }: ScheduledTelegramPreviewProps) {
    function renderButton(button: InlineKeyboardButton) {
        return <MessageBubble.Action key={button.callback_data ?? button.url ?? button.text} disabled>{button.text}</MessageBubble.Action>
    }
    function renderRow(row: InlineKeyboardButton[], index: number) {
        return <MessageBubble.ActionRow key={index}>{row.map(renderButton)}</MessageBubble.ActionRow>
    }
    return <MessageBubble.Root className="max-w-[min(100%,28rem)] text-[#168acd] dark:text-[#6ab3f3]">
        <MessageBubble.Content className="bg-white text-[#17212b] dark:bg-[#182533] dark:text-[#f5f5f5]">
            <RichTextEditor.Root value={preview.html} onChange={ignoreChange} disabled>
                <RichTextEditor.Content className="rounded-none border-0 bg-transparent text-inherit shadow-none [&_.ProseMirror]:min-h-0 [&_.ProseMirror]:p-0 [&_.tiptap]:text-base! [&_.tiptap]:leading-[1.375]! [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p+p]:mt-2 [&_a]:text-[#168acd]" />
            </RichTextEditor.Root>
            {sendTime ? <MessageBubble.Footer aria-label="Message time" className="text-[#7b8b93] dark:text-[#708499]">{sendTime}</MessageBubble.Footer> : null}
        </MessageBubble.Content>
        {preview.replyMarkup ? <MessageBubble.Actions role="group" aria-label="Attached message buttons">{preview.replyMarkup.inline_keyboard.map(renderRow)}</MessageBubble.Actions> : null}
    </MessageBubble.Root>
}
