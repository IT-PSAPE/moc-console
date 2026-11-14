import { Button } from '@moc/ui/components/controls/button'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import type { Request } from '@moc/types/requests'
import { Check, Copy, ImageSquare as MediaImagePlus, ShareNetwork as ShareAndroid } from '@phosphor-icons/react'
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
type IconSize = ComponentProps<typeof Button.Icon>['size']

const RequestShareActionsContext = createContext<RequestShareActionsContextValue | null>(null)

function Root({ children, request, targetRef }: RequestShareActionsRootProps) {
  const value = useRequestShare({ request, targetRef })
  return <RequestShareActionsContext value={value}>{children}</RequestShareActionsContext>
}

function LinkButton({ variant = 'secondary', size }: { variant?: IconVariant; size?: IconSize }) {
  const { actions, state } = useRequestShareActionsContext()

  return (
    <Button.Icon
      variant={variant}
      size={size}
      icon={state.isSharingLink ? <Spinner size="sm" /> : <ShareAndroid />}
      onClick={actions.shareLink}
      disabled={state.isSharingLink || state.isSharingScreenshot}
      aria-label="Share request link"
    />
  )
}

function ScreenshotButton({ variant = 'secondary', size }: { variant?: IconVariant; size?: IconSize }) {
  const { actions, state } = useRequestShareActionsContext()

  return (
    <Button.Icon
      variant={variant}
      size={size}
      icon={state.isSharingScreenshot ? <Spinner size="sm" /> : <MediaImagePlus />}
      onClick={actions.shareScreenshot}
      disabled={state.isSharingLink || state.isSharingScreenshot}
      aria-label="Share request screenshot"
    />
  )
}

function CopyButton({ variant = 'secondary', size }: { variant?: IconVariant; size?: IconSize }) {
  const { actions, state } = useRequestShareActionsContext()

  return (
    <Button.Icon
      variant={variant}
      size={size}
      icon={
        state.isCopyingScreenshot
          ? <Spinner size="sm" />
          : state.hasCopiedScreenshot
            ? <Check weight="regular" className="text-success" />
            : <Copy />
      }
      onClick={actions.copyScreenshot}
      disabled={state.isSharingLink || state.isSharingScreenshot || state.isCopyingScreenshot}
      aria-label="Copy request screenshot"
      title="Copy request screenshot"
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
  CopyButton,
  Root,
  LinkButton,
  ScreenshotButton,
}
