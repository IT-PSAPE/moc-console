import { Button } from '@moc/ui/components/controls/button'
import type { Request } from '@moc/types/requests'
import { ImageUp, Loader, Share2 } from 'lucide-react'
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react'
import { useRequestShare } from './use-request-share'

type RequestShareActionsRootProps = {
  children: ReactNode
  request: Request
  targetRef: RefObject<HTMLDivElement | null>
}

type RequestShareActionsContextValue = ReturnType<typeof useRequestShare>
type IconVariant = ComponentProps<typeof Button.Icon>['variant']

const RequestShareActionsContext = createContext<RequestShareActionsContextValue | null>(null)

function Root({ children, request, targetRef }: RequestShareActionsRootProps) {
  const value = useRequestShare({ request, targetRef })
  return <RequestShareActionsContext value={value}>{children}</RequestShareActionsContext>
}

function LinkButton({ variant = 'ghost' }: { variant?: IconVariant }) {
  const { actions, state } = useRequestShareActionsContext()

  return (
    <Button.Icon
      variant={variant}
      icon={state.isSharingLink ? <Loader className="animate-spin" /> : <Share2 />}
      onClick={actions.shareLink}
      disabled={state.isSharingLink || state.isSharingScreenshot}
      aria-label="Share request link"
      title="Share request link"
    />
  )
}

function ScreenshotButton({ variant = 'ghost' }: { variant?: IconVariant }) {
  const { actions, state } = useRequestShareActionsContext()

  return (
    <Button.Icon
      variant={variant}
      icon={state.isSharingScreenshot ? <Loader className="animate-spin" /> : <ImageUp />}
      onClick={actions.shareScreenshot}
      disabled={state.isSharingLink || state.isSharingScreenshot}
      aria-label="Share request screenshot"
      title="Share request screenshot"
    />
  )
}

function useRequestShareActionsContext() {
  const context = useContext(RequestShareActionsContext)

  if (!context) {
    throw new Error('RequestShareActions components must be used within RequestShareActions.Root.')
  }

  return context
}

export const RequestShareActions = {
  Root,
  LinkButton,
  ScreenshotButton,
}
