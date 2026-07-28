import { useEffect, useMemo, useState } from "react"
import { Combobox } from "@moc/ui/components/form/combobox"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Paragraph } from "@moc/ui/components/display/text"
import { fetchTelegramGroups } from "@/data/fetch-telegram-groups"
import { useWorkspace } from "@/lib/workspace-context"
import {
  notifyDestinationKey,
  sameNotifyDestination,
  type NotifyDestination,
} from "@moc/types/streams"

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
function toOptions(groups: Awaited<ReturnType<typeof fetchTelegramGroups>>): DestinationOption[] {
  const options: DestinationOption[] = []

  for (const group of groups) {
    if (!group.active || group.removedAt) continue

    options.push({
      groupChatId: group.chatId,
      threadId: null,
      label: group.title,
      groupTitle: group.title,
    })

    for (const topic of group.topics) {
      if (topic.closed) continue
      options.push({
        groupChatId: group.chatId,
        threadId: topic.threadId,
        label: `${group.title} › ${topic.name}`,
        groupTitle: group.title,
      })
    }
  }

  return options
}

type LoadState = {
  workspaceId: string | null
  status: "loading" | "ready" | "failed"
  options: DestinationOption[]
}

export function NotifyDestinationField({ value, onChange }: NotifyDestinationFieldProps) {
  const { currentWorkspaceId } = useWorkspace()
  const [load, setLoad] = useState<LoadState>({
    workspaceId: null,
    status: "loading",
    options: [],
  })

  // Reset during render when the workspace changes, rather than in an effect —
  // React's documented "adjusting state when a prop changes" pattern. Doing it
  // in the effect would setState synchronously and cascade a second render.
  if (currentWorkspaceId && load.workspaceId !== currentWorkspaceId) {
    setLoad({ workspaceId: currentWorkspaceId, status: "loading", options: [] })
  }

  useEffect(() => {
    if (!currentWorkspaceId) return
    let cancelled = false

    fetchTelegramGroups(currentWorkspaceId)
      .then((groups) => {
        if (cancelled) return
        // Ignore a response that lost the race to a workspace switch.
        setLoad((previous) =>
          previous.workspaceId === currentWorkspaceId
            ? { ...previous, status: "ready", options: toOptions(groups) }
            : previous,
        )
      })
      .catch((error) => {
        if (cancelled) return
        console.error("Failed to load Telegram destinations", error)
        setLoad((previous) =>
          previous.workspaceId === currentWorkspaceId
            ? { ...previous, status: "failed" }
            : previous,
        )
      })

    return () => {
      cancelled = true
    }
  }, [currentWorkspaceId])

  const { options, status } = load
  const isLoading = status === "loading"
  const failed = status === "failed"

  // The combobox holds option objects (they carry the label); the form only
  // cares about the destination pair.
  const selected = useMemo(
    () =>
      value
        .map((destination) => options.find((option) => sameNotifyDestination(option, destination)))
        .filter((option): option is DestinationOption => option !== undefined),
    [value, options],
  )

  function handleChange(next: DestinationOption[]) {
    onChange(next.map(({ groupChatId, threadId }) => ({ groupChatId, threadId })))
  }

  const hasOptions = options.length > 0

  return (
    <div className="flex flex-col gap-1.5">
      <FormLabel label="Send notification to" optional />

      <Combobox.Root
        multiple
        items={options}
        value={selected}
        onValueChange={handleChange as never}
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
        <Combobox.Content empty="No matching group or topic">
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
