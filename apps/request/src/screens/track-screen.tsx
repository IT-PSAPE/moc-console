import { useNavigate } from 'react-router-dom'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { Alert } from '@moc/ui/components/feedback/alert'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { PublicLayout } from '@/features/components/public-layout'
import { TrackingResult } from '@/features/components/tracking-result'
import { useTrackingLookup } from '@/features/hooks/use-tracking-lookup'
import { routes } from '@/screens/console-routes'
import { Search, FileSearch } from 'lucide-react'
import { FlowHeader } from '@/features/components/flow-header'
import { PublicFlow } from '@/features/components/public-flow'
import type { ChangeEvent, FormEvent } from 'react'

export function TrackScreen() {
  const navigate = useNavigate()
  const { code, setCode, result, loading, error, notFound, lookup } = useTrackingLookup()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    lookup()
  }

  function handleBack() {
    navigate(routes.publicHome)
  }

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setCode(event.target.value)
  }

  return (
    <PublicLayout className="py-8 sm:py-12">
      <FlowHeader title="Track submission" description="Enter your tracking code to view its status." onBack={handleBack} />

      <PublicFlow>
        <form onSubmit={handleSubmit} className="my-10 flex gap-2 sm:my-16">
          <Input
            aria-label="Tracking code"
            name="tracking-code"
            autoComplete="off"
            className="flex-1"
            icon={<Search />}
            placeholder="e.g. REQ-A1B2C3"
            value={code}
            onChange={handleCodeChange}
          />
          <Button type="submit" disabled={!code.trim() || loading}>
            {loading ? <Spinner size="sm" /> : 'Search'}
          </Button>
        </form>

        {error && <Alert title="Lookup failed" description={error} variant="error" style="filled" />}

        {loading && <div className="flex justify-center"><Spinner size="md" /></div>}

        {notFound && (
          <EmptyState
            icon={<FileSearch />}
            title="No submission found"
            description="No request or booking matches that tracking code. Double-check the code and try again."
          />
        )}

        {result && <TrackingResult data={result} />}

      </PublicFlow>
    </PublicLayout>
  )
}
