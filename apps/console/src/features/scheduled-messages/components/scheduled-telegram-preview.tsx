import type { InlineKeyboardButton } from '@moc/notifications'
import { MessageBubble } from '@moc/ui/components/display/message-bubble/message-bubble'
import { RichTextEditor } from '@moc/ui/components/form/rich-text-editor'
import type { ScheduledMessagePreview } from '../scheduled-message-preview'

type ScheduledTelegramPreviewProps = { preview: ScheduledMessagePreview }

const actionClasses = {
    primary: 'bg-[#2a8bd4] text-white hover:bg-[#2a8bd4]',
    success: 'bg-[#398c50] text-white hover:bg-[#398c50]',
    danger: 'bg-[#bd4545] text-white hover:bg-[#bd4545]',
    neutral: 'bg-[#253543] text-white hover:bg-[#304354]',
}

function ignoreChange(): void { /* This preview cannot edit the draft. */ }

function renderButton(button: InlineKeyboardButton) {
    return <MessageBubble.Action key={button.callback_data ?? button.url ?? button.text} disabled className={actionClasses[button.style ?? 'neutral']}>{button.text}</MessageBubble.Action>
}

function renderRow(row: InlineKeyboardButton[], index: number) {
    return <MessageBubble.ActionRow key={index}>{row.map(renderButton)}</MessageBubble.ActionRow>
}

export function ScheduledTelegramPreview({ preview }: ScheduledTelegramPreviewProps) {
    return <MessageBubble.Root className="w-full text-white">
        <MessageBubble.Content className="rounded-xl rounded-bl-none bg-[#202d3b] px-3 py-2 text-white before:bg-[#202d3b]">
            <RichTextEditor.Root value={preview.html} onChange={ignoreChange} disabled>
                <RichTextEditor.Content className="overflow-visible rounded-none border-0 bg-transparent p-0 text-inherit shadow-none [&_.ProseMirror]:min-h-0 [&_.ProseMirror]:p-0 [&_.ProseMirror]:outline-none [&_.tiptap]:text-base! [&_.tiptap]:leading-[1.35]! [&_.ProseMirror_p]:my-0 [&_.ProseMirror_p+p]:mt-1 [&_a]:text-[#61b8ff] [&_blockquote]:border-[#52708a] [&_blockquote]:text-[#d8e5ef] [&_th]:bg-[#26394b] [&_:is(td,th)]:border-[#405469] [&_pre]:bg-[#172431]" />
            </RichTextEditor.Root>
            {preview.footerLabel ? <MessageBubble.Footer className="text-[#97a8b7]">{preview.footerLabel}</MessageBubble.Footer> : null}
        </MessageBubble.Content>
        {preview.replyMarkup ? <MessageBubble.Actions role="group" aria-label="Attached message buttons">{preview.replyMarkup.inline_keyboard.map(renderRow)}</MessageBubble.Actions> : null}
    </MessageBubble.Root>
}
