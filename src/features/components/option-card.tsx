import { Card } from '@/components/display/card'
import { Label } from '@/components/display/text'
import { Paragraph } from '@/components/display/text'
import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export function OptionCard({ icon, title, description, onClick, className }: { icon: ReactNode; title: string; description: string; onClick: () => void; className?: string }) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <div
      className={cn('cursor-pointer transition-all hover:shadow-sm active:scale-[0.98] rounded-lg', className)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <Card.Root className="hover:border-brand transition-colors pointer-events-none">
        <Card.Content className="flex flex-col items-center gap-3 p-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand *:size-6">
            {icon}
          </span>
          <Label.md>{title}</Label.md>
          <Paragraph.sm className="text-secondary">{description}</Paragraph.sm>
        </Card.Content>
      </Card.Root>
    </div>
  )
}
