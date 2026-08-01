import { Combobox } from "@moc/ui/components/form/combobox"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Paragraph } from "@moc/ui/components/display/text"
import {
  notifyDestinationKey,
  sameNotifyDestination,
  type NotifyDestination,
} from "@moc/types/streams"
import { useNotifyDestinations } from "./use-notify-destinations"

// Overrides where the creation notification for this stream/meeting is sent.
//
// Empty selection = the workspace's Settings routing decides, including
// sending nothing when no route is configured. A non-empty selection replaces
// that routing entirely for this one notification — it does not add to it.

export type DestinationOption = NotifyDestination & {
  /** "Group" or "Group › Topic", shown in the list and on the chip. */
  label: string
  groupTitle: string
}

type NotifyDestinationFieldProps = {
  value: NotifyDestination[]
  onChange: (destinations: NotifyDestination[]) => void
}

/**
 * Flattens registered groups into one option per deliverable destination:
 * the group's main chat, plus each of its open forum topics.
 *
 * Inactive groups are excluded — the dispatcher refuses to send to them, so
 * offering them would promise a delivery that never happens. Closed topics
 * are excluded for the same reason: Telegram rejects posts to them.
 */
export function NotifyDestinationField({ value, onChange }: NotifyDestinationFieldProps) {
  const { state, actions } = useNotifyDestinations(value, onChange)
  const { options, selected, status } = state
  const isLoading = status === "loading"
  const failed = status === "failed"

  // The combobox holds option objects (they carry the label); the form only
  // cares about the destination pair.
  const hasOptions = options.length > 0

  return (
    <div className="flex flex-col gap-1.5">
      <FormLabel label="Send notification to" optional />

      <Combobox.Root
        multiple
        items={options}
        value={selected}
        onValueChange={actions.changeDestinations as never}
        itemToStringLabel={(option: DestinationOption) => option.label}
        isItemEqualToValue={sameNotifyDestination}
        disabled={!hasOptions}
      >
        <Combobox.ChipsField
          chipLabel={(option: DestinationOption) => option.label}
          chipKey={notifyDestinationKey}
          placeholder={
            isLoading
              ? "Loading destinations…"
              : hasOptions
                ? "Use notification settings"
                : "No Telegram groups registered"
          }
        />
        <Combobox.Content empty="No matching group or topic" searchPlaceholder="Search groups and topics">
          {(option: DestinationOption) => (
            <Combobox.Item key={notifyDestinationKey(option)} value={option}>
              {option.label}
            </Combobox.Item>
          )}
        </Combobox.Content>
      </Combobox.Root>

      {failed ? (
        <Paragraph.xs className="text-utility-red-700">
          Couldn't load your Telegram groups. The notification will follow your notification settings.
        </Paragraph.xs>
      ) : (
        <Paragraph.xs className="text-quaternary">
          {selected.length > 0
            ? "Sent only to the destinations above, instead of the ones in your notification settings."
            : "Leave empty to follow your notification settings."}
        </Paragraph.xs>
      )}
    </div>
  )
}
