import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { Request } from '@moc/types/requests'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { useCallback, useState, type RefObject } from 'react'
import {
  buildRequestScreenshotFileName,
  buildRequestShareUrl,
  captureElementAsPngFile,
} from './request-share-utils'

type UseRequestShareOptions = {
  request: Request
  targetRef: RefObject<HTMLDivElement | null>
}

export function useRequestShare({ request, targetRef }: UseRequestShareOptions) {
  const { toast } = useFeedback()
  const [isSharingLink, setIsSharingLink] = useState(false)
  const [isSharingScreenshot, setIsSharingScreenshot] = useState(false)
  const shareUrl = buildRequestShareUrl(request.id)

  const shareLink = useCallback(async () => {
    if (!navigator.share) {
      toast({
        title: 'Sharing is not supported here',
        description: 'This browser does not support the native share sheet.',
        variant: 'error',
      })
      return
    }

    setIsSharingLink(true)

    try {
      await navigator.share({
        title: request.title,
        text: request.title,
        url: shareUrl,
      })
    } catch (error) {
      if (!isShareCancelled(error)) {
        toast({
          title: 'Could not share link',
          description: getErrorMessage(error, 'The request link could not be shared.'),
          variant: 'error',
        })
      }
    } finally {
      setIsSharingLink(false)
    }
  }, [request.title, shareUrl, toast])

  const shareScreenshot = useCallback(async () => {
    if (!navigator.share) {
      toast({
        title: 'Sharing is not supported here',
        description: 'This browser does not support the native share sheet.',
        variant: 'error',
      })
      return
    }

    const target = targetRef.current
    if (!target) {
      toast({
        title: 'Could not share screenshot',
        description: 'The request details are not ready yet.',
        variant: 'error',
      })
      return
    }

    setIsSharingScreenshot(true)

    try {
      const file = await captureElementAsPngFile(target, buildRequestScreenshotFileName(request.title))

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        toast({
          title: 'Image sharing is not supported here',
          description: 'This browser can share links, but not screenshot files.',
          variant: 'error',
        })
        return
      }

      await navigator.share({
        title: request.title,
        text: request.title,
        files: [file],
      })
    } catch (error) {
      if (!isShareCancelled(error)) {
        toast({
          title: 'Could not share screenshot',
          description: getErrorMessage(error, 'The request screenshot could not be shared.'),
          variant: 'error',
        })
      }
    } finally {
      setIsSharingScreenshot(false)
    }
  }, [request.title, targetRef, toast])

  return {
    state: {
      isSharingLink,
      isSharingScreenshot,
    },
    actions: {
      shareLink,
      shareScreenshot,
    },
    meta: {
      shareUrl,
    },
  }
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
