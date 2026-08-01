import type { HTMLAttributes } from "react"
import { cn } from "@moc/utils/cn"

function PublicFlowRoot({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-content-sm", className)} {...props} />
}

function PublicFlowProgress({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-10 sm:my-16", className)} {...props} />
}

function PublicFlowActions({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-10 flex w-full flex-col gap-2 *:w-full", className)} {...props} />
}

export const PublicFlow = Object.assign(PublicFlowRoot, {
  Actions: PublicFlowActions,
  Progress: PublicFlowProgress,
})
