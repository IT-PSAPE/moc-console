import { useCallback, useState } from 'react'
import { Alert } from '@/components/feedback/alert'
import { Button } from '@/components/controls/button'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Copy, Check } from 'lucide-react'

type SubmissionConfirmationProps = {
  trackingCodes: string[]
  type: 'request' | 'booking'
  onBackToHome: () => void
}

export function SubmissionConfirmation({ trackingCodes, type, onBackToHome }: SubmissionConfirmationProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = useCallback(async (code: string, index: number) => {
    await navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [])

  const handleCopyAll = useCallback(async () => {
    await navigator.clipboard.writeText(trackingCodes.join('\n'))
    setCopiedIndex(-1)
    setTimeout(() => setCopiedIndex(null), 2000)
  }, [trackingCodes])

  const typeLabel = type === 'request' ? 'Request' : 'Booking'
  const plural = trackingCodes.length > 1

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Alert
        title={`${typeLabel}${plural ? 's' : ''} Submitted`}
        description={`Your ${typeLabel.toLowerCase()}${plural ? 's have' : ' has'} been received and ${plural ? 'are' : 'is'} being processed.`}
        variant="success"
        style="filled"
      />

      <div className="flex flex-col items-center gap-3 w-full">
        <Paragraph.md className="text-secondary">
          {plural ? 'Your tracking codes are:' : 'Your tracking code is:'}
        </Paragraph.md>
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {trackingCodes.map((code, i) => (
            <div key={code} className="flex items-center justify-center gap-3 rounded-xl border border-secondary bg-secondary/50 px-5 py-3">
              <Title.h4 className="font-mono tracking-widest">{code}</Title.h4>
              <Button.Icon
                icon={copiedIndex === i ? <Check /> : <Copy />}
                variant="ghost"
                onClick={() => handleCopy(code, i)}
                aria-label={`Copy ${code}`}
              />
            </div>
          ))}
        </div>
        {plural && (
          <Button variant="ghost" icon={copiedIndex === -1 ? <Check /> : <Copy />} onClick={handleCopyAll}>
            Copy all
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Label.sm className="text-secondary">Save {plural ? 'these codes' : 'this code'} to track your submission status.</Label.sm>
        <Paragraph.xs className="text-tertiary">
          You can look up your {typeLabel.toLowerCase()}{plural ? 's' : ''} anytime from the home page.
        </Paragraph.xs>
      </div>

      <Button variant="secondary" onClick={onBackToHome}>
        Back to Home
      </Button>
    </div>
  )
}
