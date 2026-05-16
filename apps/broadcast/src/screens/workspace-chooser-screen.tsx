import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@moc/ui/components/display/text'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { TvMinimalPlay } from 'lucide-react'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { listWorkspaces, type BroadcastWorkspace } from '@/data/fetch-broadcast'
import { homePath } from '@/screens/broadcast-routes'

const TILE_GRADIENTS = [
  'from-utility-brand-600 to-utility-brand-400',
  'from-sky-600 to-sky-400',
  'from-purple-600 to-purple-400',
  'from-teal-600 to-teal-400',
  'from-orange-600 to-orange-400',
]

export function WorkspaceChooserScreen() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<BroadcastWorkspace[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listWorkspaces()
      .then((data) => { if (!cancelled) setWorkspaces(data) })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e, 'Could not load workspaces.')) })
    return () => { cancelled = true }
  }, [])

  return (
    <div data-theme="dark" className="min-h-dvh bg-primary flex flex-col items-center justify-center px-6 py-16">
      <div className="flex items-center gap-2.5 mb-12">
        <TvMinimalPlay className="size-7 text-brand_secondary" />
        <Title.h5 className="tracking-tight">MOC Broadcast</Title.h5>
      </div>

      {error ? (
        <EmptyState icon={<TvMinimalPlay />} title="Couldn't load workspaces" description={error} />
      ) : workspaces === null ? (
        <Spinner size="lg" />
      ) : workspaces.length === 0 ? (
        <EmptyState icon={<TvMinimalPlay />} title="No workspaces available" description="There is nothing to broadcast yet." />
      ) : (
        <div className="flex flex-col items-center gap-10">
          <Title.h2 className="text-center">Choose a space</Title.h2>
          <div className="flex flex-wrap items-start justify-center gap-6 max-w-3xl">
            {workspaces.map((ws, i) => (
              <button
                key={ws.id}
                onClick={() => navigate(homePath(ws.id))}
                className="group flex flex-col items-center gap-3 cursor-pointer focus:outline-none"
              >
                <div
                  className={`size-32 max-mobile:size-24 rounded-2xl bg-linear-to-br ${TILE_GRADIENTS[i % TILE_GRADIENTS.length]} flex items-center justify-center ring-0 ring-white/0 group-hover:ring-4 group-focus-visible:ring-4 group-hover:ring-white/80 transition-all duration-200 group-hover:scale-105`}
                >
                  <span className="text-white text-4xl font-semibold select-none">
                    {ws.name.trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <Paragraph.md className="text-tertiary group-hover:text-primary transition-colors max-w-32 truncate">
                  {ws.name}
                </Paragraph.md>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
