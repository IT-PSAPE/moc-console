import { Divider } from "@moc/ui/components/display/divider"
import { Paragraph, Title } from "@moc/ui/components/display/text"
import { Alert } from "@moc/ui/components/feedback/alert"
import { ChecklistSectionView } from "@/features/telegram/components/checklist-section-view"
import { useChecklistToggle } from "@/features/telegram/use-checklist-toggle"
import { useMiniAppContext } from "@/features/telegram/mini-app-context"
import type { MiniAppChecklistDetail } from "@moc/notifications"

export function ChecklistScreen({ detail }: { detail: MiniAppChecklistDetail }) {
  const { state, actions } = useMiniAppContext()
  const checklist = useChecklistToggle({ initData: state.initData, detail, setDetail: actions.setDetail })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Title.h1 className="title-h4">{detail.name}</Title.h1>
        {detail.description && <Paragraph.sm className="text-secondary">{detail.description}</Paragraph.sm>}
        <Paragraph.xs className="text-tertiary">{detail.scheduledAt}</Paragraph.xs>
      </header>

      {checklist.state.lastError && (
        <Alert variant="error" style="filled" title="Couldn't save that change" description={checklist.state.lastError} />
      )}

      {detail.sections.map((section, index) => (
        <div key={section.id ?? section.name} className="flex flex-col gap-6">
          {index > 0 && <Divider />}
          <ChecklistSectionView section={section} pendingItemIds={checklist.state.pendingItemIds} onToggle={checklist.actions.toggle} />
        </div>
      ))}
    </div>
  )
}
