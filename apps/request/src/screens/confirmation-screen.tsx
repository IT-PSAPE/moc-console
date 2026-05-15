import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/features/components/public-layout'
import { routes } from '@/screens/console-routes'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

type ConfirmationState = {
  type: 'request' | 'booking'
  trackingCode: string
}

export function ConfirmationScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const confirmationState = location.state as ConfirmationState | null
  const [copied, setCopied] = useState(false)

  if (!confirmationState?.trackingCode) {
    return <Navigate to={routes.publicHome} replace />
  }

  const { type, trackingCode } = confirmationState
  const typeLabel = type === 'request' ? 'Request' : 'Booking'

  function handleBackToHome() {
    navigate(routes.publicHome)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(trackingCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <PublicLayout className="py-16">
      <img src="/assets/icon_check.png" className='size-60 mb-8 mx-auto' />

      <div className="flex flex-col items-center gap-3 w-full mb-8">
        <Paragraph.md className="text-secondary">Your tracking code is:</Paragraph.md>
        <div className="flex items-center justify-center gap-3 rounded-xl border border-secondary bg-secondary/50 px-5 py-3 cursor-pointer w-full max-w-sm" onClick={handleCopy} >
          <Title.h4 className="font-mono tracking-widest">{trackingCode}</Title.h4>
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-tertiary" />}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Label.sm className="text-secondary">Save this code to track your submission status.</Label.sm>
        <Paragraph.xs className="text-tertiary">
          You can look up your {typeLabel.toLowerCase()} anytime from the home page.
        </Paragraph.xs>
      </div>


      <div className="flex flex-col w-full max-w-sm gap-2 mx-auto mt-20">
        <Button onClick={handleBackToHome} className="rounded-full px-6 py-3">
          New Submission
        </Button>
        <Button variant="secondary" onClick={handleBackToHome} className="rounded-full px-6 py-3">
          Back to Home
        </Button>
      </div>
    </PublicLayout>
  )
}
