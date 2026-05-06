import { Label, Paragraph, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { Timeline } from '@/components/timeline'
import { fetchSharedEventView, type SharedEventView } from '@/data/event-shares'
import { routes } from '@/screens/console-routes'
import { CalendarClock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'

export function CueSheetShareScreen() {
    const { token } = useParams<{ token: string }>()
    const [state, setState] = useState<{ status: 'loading' } | { status: 'ready'; view: SharedEventView } | { status: 'missing' } | { status: 'error'; message: string }>(
        () => (token ? { status: 'loading' } : { status: 'missing' }),
    )

    useEffect(() => {
        if (!token) return
        let active = true
        fetchSharedEventView(token)
            .then((view) => {
                if (!active) return
                if (!view) {
                    setState({ status: 'missing' })
                    return
                }
                setState({ status: 'ready', view })
            })
            .catch((error) => {
                if (!active) return
                setState({
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Could not load this share.',
                })
            })
        return () => {
            active = false
        }
    }, [token])

    if (state.status === 'loading') {
        return (
            <ShellWrapper>
                <div className="flex justify-center py-16">
                    <Spinner size="lg" />
                </div>
            </ShellWrapper>
        )
    }

    if (state.status === 'missing') {
        return (
            <ShellWrapper>
                <div className="mx-auto max-w-content-sm px-6 py-16 text-center">
                    <Title.h4 className="mb-2">Share unavailable</Title.h4>
                    <Paragraph.md className="text-tertiary mb-6">
                        This share link is invalid, has been revoked, or has expired. Ask the event owner for a new link.
                    </Paragraph.md>
                    <Link to="/" className="text-brand hover:underline">Go to MOC Console</Link>
                </div>
            </ShellWrapper>
        )
    }

    if (state.status === 'error') {
        return (
            <ShellWrapper>
                <div className="mx-auto max-w-content-sm px-6 py-16 text-center">
                    <Title.h4 className="mb-2">Something went wrong</Title.h4>
                    <Paragraph.md className="text-tertiary mb-6">{state.message}</Paragraph.md>
                </div>
            </ShellWrapper>
        )
    }

    const { view } = state
    const scheduledLabel = view.event.scheduledAt
        ? formatUtcIsoInBrowserTimeZone(view.event.scheduledAt)
        : null

    return (
        <ShellWrapper>
            <div className="border-b border-secondary px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <Label.xs className="text-quaternary uppercase tracking-wide">Live event timeline</Label.xs>
                    <Title.h6 className="truncate">{view.event.title}</Title.h6>
                    {scheduledLabel && (
                        <Paragraph.xs className="text-tertiary inline-flex items-center gap-1.5">
                            <CalendarClock className="size-3.5" />
                            {scheduledLabel}
                        </Paragraph.xs>
                    )}
                </div>
                <Paragraph.xs className="text-tertiary">
                    Read-only · {view.event.duration} min
                </Paragraph.xs>
            </div>

            <Timeline
                tracks={view.tracks}
                totalMin={view.event.duration}
                readOnly
                className="flex-1 min-h-0"
                playbackSync={view.share.liveSyncEnabled ? {
                    eventId: view.event.id,
                    role: 'follower',
                } : null}
                initialPlayback={{
                    currentTimeMinutes: view.playback.currentTimeMin,
                    isPlaying: view.playback.isPlaying,
                }}
            >
                <Timeline.Toolbar
                    renderTitle={() => (
                        <Label.sm className="truncate">{view.event.title}</Label.sm>
                    )}
                />
            </Timeline>
        </ShellWrapper>
    )
}

function ShellWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh flex flex-col bg-primary text-primary">
            <header className="border-b border-secondary">
                <div className="mx-auto max-w-content-md flex items-center gap-4 px-6 py-3">
                    <Link to="/" className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-brand_solid">
                            <img src="/logo.svg" alt="" className="w-full h-full" />
                        </div>
                        <span className="label-md">MOC Console</span>
                    </Link>
                    <nav className="ml-auto flex items-center gap-5">
                        <Link to={`/${routes.support}`} className="paragraph-sm text-tertiary hover:text-primary">Support</Link>
                        <Link to={`/${routes.privacy}`} className="paragraph-sm text-tertiary hover:text-primary">Privacy</Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1 flex flex-col min-h-0">
                {children}
            </main>
        </div>
    )
}
