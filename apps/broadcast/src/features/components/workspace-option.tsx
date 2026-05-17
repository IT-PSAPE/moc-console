import { Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import type { BroadcastWorkspace } from '@/data/fetch-broadcast'

type WorkspaceOptionProps = {
  workspace: BroadcastWorkspace
  gradient: string
  onSelect: (id: string) => void
}

export function WorkspaceOption({ workspace, gradient, onSelect }: WorkspaceOptionProps) {
  function handleSelect() {
    onSelect(workspace.id)
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSelect}
      className="group !block shrink-0 !border-transparent !bg-transparent !p-0 text-center hover:!bg-transparent"
    >
      <div
        className={`size-32 max-mobile:size-24 rounded-2xl bg-linear-to-br ${gradient} flex items-center justify-center ring-0 ring-white/0 group-hover:ring-4 group-focus-visible:ring-4 group-hover:ring-white/80 transition-all duration-200 group-hover:scale-105`}
      >
        <span className="text-white text-4xl font-semibold select-none">
          {workspace.name.trim().charAt(0).toUpperCase()}
        </span>
      </div>
      <Paragraph.md className="mt-3 text-tertiary group-hover:text-primary transition-colors max-w-32 truncate">
        {workspace.name}
      </Paragraph.md>
    </Button>
  )
}
