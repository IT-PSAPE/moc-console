import type { ComponentPropsWithoutRef, ElementType } from "react"
import { cn } from "@moc/utils/cn"

type PublicFlowRootProps<T extends ElementType> = {
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, 'as'>

function PublicFlowRoot<T extends ElementType = 'div'>({ as, className, ...props }: PublicFlowRootProps<T>) {
  const Component = as ?? 'div'

  return <Component className={cn("mx-auto w-full max-w-content-sm", className)} {...props} />
}

function PublicFlowProgress({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn("my-10 sm:my-16", className)} {...props} />
}

function PublicFlowActions({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn("mt-10 flex w-full flex-col gap-2 *:w-full", className)} {...props} />
}

export const PublicFlow = Object.assign(PublicFlowRoot, {
  Actions: PublicFlowActions,
  Progress: PublicFlowProgress,
})
