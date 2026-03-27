import type { ReactNode } from 'react'

function Root({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-border-secondary bg-background-primary transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </div>
  )
}

function Image({ src, alt, fallback }: { src?: string; alt: string; fallback?: ReactNode }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-background-secondary">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {fallback ?? <span className="text-sm text-text-quaternary">{alt}</span>}
        </div>
      )}
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <div className="absolute top-2 left-2">
      {children}
    </div>
  )
}

function Body({ children }: { children: ReactNode }) {
  return <div className="p-3">{children}</div>
}

function Title({ children }: { children: ReactNode }) {
  return <p className="truncate text-sm font-medium text-text-primary">{children}</p>
}

function Description({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-text-quaternary line-clamp-2">{children}</p>
}

function Meta({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">{children}</div>
}

function Actions({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-background-primary/90 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
      {children}
    </div>
  )
}

export const ResourceCard = { Root, Image, Badge, Body, Title, Description, Meta, Actions }
