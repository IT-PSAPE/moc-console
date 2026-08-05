import { Label } from '@moc/ui/components/display/text'
import { Paragraph } from '@moc/ui/components/display/text'
import { cn } from '@moc/utils/cn'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@moc/ui/components/controls/button'

export function OptionCard({ icon, title, description, onClick, className }: { icon: ReactNode; title: string; description: string; onClick: () => void; className?: string }) {
  return (
    <Button.Surface
      className={cn(
        'group flex items-center gap-4 rounded-xl p-4 cursor-pointer transition-[background-color,border-color,box-shadow,transform] motion-reduce:transition-none',
        'bg-secondary_alt hover:bg-secondary_hover active:scale-[0.98]',
        className,
      )}
      onClick={onClick}
    >
      <span className="flex shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <Label.md>{title}</Label.md>
        <Paragraph.xs className="text-secondary mt-0.5">{description}</Paragraph.xs>
      </div>
      <ChevronRight className="size-4 text-quaternary shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
    </Button.Surface>
  )
}
