import { useNavigate } from 'react-router-dom'
import { Title, Paragraph } from '@/components/display/text'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Spinner } from '@/components/feedback/spinner'
import { Alert } from '@/components/feedback/alert'
import { EmptyState } from '@/components/feedback/empty-state'
import { PublicLayout } from '@/features/components/public-layout'
import { TrackingResult } from '@/features/components/tracking-result'
import { useTrackingLookup } from '@/features/hooks/use-tracking-lookup'
import { routes } from '@/screens/console-routes'
import { Search, ArrowLeft, FileSearch } from 'lucide-react'

export function TrackScreen() {
  const navigate = useNavigate()
  const { code, setCode, result, loading, error, notFound, lookup } = useTrackingLookup()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    lookup()
  }

  function handleBack() {
    navigate(routes.publicHome)
  }

  return (
    <PublicLayout className="py-16">
      <div className="flex max-mobile:flex-col">
        <div className="shrink-0 w-full max-w-40 mb-8">
          <Button variant="ghost" icon={<ArrowLeft />} onClick={handleBack} className="self-start">Back</Button>
        </div>
        <div className="flex flex-col gap-1 flex-1 text-center">
          <Title.h3>Track Submission</Title.h3>
          <Paragraph.sm className="text-secondary">Enter your tracking code to view the status of your request or booking.</Paragraph.sm>
        </div>
        <div className="shrink-0 w-full max-w-40" />
      </div>

      <div className="w-full max-w-content-sm mx-auto">
        <form onSubmit={handleSubmit} className="flex gap-2 my-20">
          <Input
            className="flex-1"
            icon={<Search />}
            placeholder="e.g. REQ-A1B2C3"
            value={code}
            onChange={(e) => setCode(e.target.value)}
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

      </div>
    </PublicLayout>
  )
}
