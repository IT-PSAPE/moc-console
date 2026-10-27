import { ScheduledMessagesRoot } from './scheduled-messages-context'
import { ScheduledMessageComposer } from './components/scheduled-message-composer'
import { ScheduledOccurrenceList } from './components/scheduled-occurrence-list'
import { ScheduledOccurrenceEditor } from './components/scheduled-occurrence-editor'
import { ScheduledOccurrenceHistory } from './components/scheduled-occurrence-history'

export const ScheduledMessages = {
    Root: ScheduledMessagesRoot,
    Composer: ScheduledMessageComposer,
    List: ScheduledOccurrenceList,
    Editor: ScheduledOccurrenceEditor,
    Activity: ScheduledOccurrenceHistory,
}
