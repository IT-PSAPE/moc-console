import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'

type FriendlyError = {
    title: string
    description: string
}

function getFriendlyError(error: Error): FriendlyError {
    const name = error.name?.toLowerCase() ?? ''
    const message = error.message?.toLowerCase() ?? ''

    if (name.includes('chunkload') || message.includes('loading chunk') || message.includes('failed to fetch dynamically imported') || message.includes('importing a module script failed')) {
        return {
            title: 'This page didn\'t finish loading',
            description: 'Part of the app couldn\'t be downloaded — usually this means a new version was deployed while you were here. Refreshing should pick it up.',
        }
    }

    if (message.includes('networkerror') || name.includes('network') || message.includes('failed to fetch')) {
        return {
            title: 'Trouble reaching the server',
            description: 'We couldn\'t connect to fetch the data this page needs. Check your connection, then try again.',
        }
    }

    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden') || message.includes('not allowed')) {
        return {
            title: 'You don\'t have access to this',
            description: 'Looks like this content isn\'t available on your account right now.',
        }
    }

    if (name.includes('typeerror') || name.includes('referenceerror')) {
        return {
            title: 'Something on this page broke',
            description: 'A part of the page didn\'t render the way it should. Refreshing usually clears it up.',
        }
    }

    return {
        title: 'Something went wrong',
        description: 'We hit an unexpected hiccup loading this page. Refreshing usually clears it up.',
    }
}

type ErrorBoundaryProps = {
    children: ReactNode
}

type ErrorBoundaryState = {
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] caught error', error, info)
    }

    render() {
        if (this.state.error) {
            return (
                <ErrorFallback error={this.state.error} />
            )
        }
        return this.props.children
    }
}

function ErrorFallback({ error }: { error: Error }) {
    const friendly = getFriendlyError(error)

    function handleRefresh() {
        window.location.reload()
    }

    return (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 p-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-utility-red-50 text-utility-red-600">
                <AlertTriangle className="size-7" />
            </span>

            <div className="flex max-w-md flex-col gap-2">
                <Label.lg className="text-primary">{friendly.title}</Label.lg>
                <Paragraph.sm className="text-tertiary">{friendly.description}</Paragraph.sm>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" icon={<RefreshCw />} onClick={handleRefresh}>
                    Refresh page
                </Button>
            </div>
        </div>
    )
}
