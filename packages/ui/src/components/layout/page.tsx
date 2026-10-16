import { cn } from '@moc/utils/cn'
import type { HTMLAttributes, Ref } from 'react'
import { Spinner } from '../feedback/spinner'

type PageWidth = 'wide' | 'standard' | 'readable'

const widthClassName: Record<PageWidth, string> = {
    wide: 'max-w-content',
    standard: 'max-w-content-md',
    readable: 'max-w-content-sm',
}

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
    width?: PageWidth
}

type PageMainProps = Omit<HTMLAttributes<HTMLElement>, 'width'> & { width?: PageWidth | 'full'; ref?: Ref<HTMLElement> }

function PageRoot({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <section className={cn('min-w-0', className)} {...props}>
            {children}
        </section>
    )
}

function PageContainer({ children, className, width = 'wide', ...props }: PageContainerProps) {
    return (
        <div className={cn('mx-auto w-full pr-[max(var(--spacing-page-gutter),env(safe-area-inset-right))] pl-[max(var(--spacing-page-gutter),env(safe-area-inset-left))]', widthClassName[width], className)} {...props}>
            {children}
        </div>
    )
}

function PageHeader({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <header className={cn('@container/collection-toolbar mx-auto flex w-full max-w-content flex-wrap items-center gap-4 pt-page-top landscape:pt-6 pr-[max(var(--spacing-page-gutter),env(safe-area-inset-right))] pb-4 pl-[max(var(--spacing-page-gutter),env(safe-area-inset-left))]', className)} {...props}>
            {children}
        </header>
    )
}

function PageHeading({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex min-w-0 max-w-full flex-[1_0_auto] flex-col gap-1.5', className)} {...props}>
            {children}
        </div>
    )
}

function PageTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h1 className={cn('title-h5 text-pretty', className)} {...props}>
            {children}
        </h1>
    )
}

function PageDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn('paragraph-sm max-w-2xl text-pretty text-tertiary', className)} {...props}>
            {children}
        </p>
    )
}

function PageActions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex shrink-0 items-center gap-2', className)} {...props}>
            {children}
        </div>
    )
}

function PageControls({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex min-w-0 flex-[1_1_28rem] flex-wrap items-center justify-end gap-2 [&>[data-ui-control]]:min-w-40 [&>[data-ui-control]]:max-w-md [&>[data-ui-control]]:flex-[1_1_12rem] landscape:[&>[data-ui-control]]:basis-full', className)} {...props}>
            {children}
        </div>
    )
}

function PageToolbar({ children, className, ...props }: PageContainerProps) {
    return (
        <PageContainer className={cn('flex flex-row items-center gap-2 pb-4 landscape:flex-col landscape:items-stretch', className)} {...props}>
            {children}
        </PageContainer>
    )
}

function PageContent({ children, className, ...props }: PageContainerProps) {
    return (
        <PageContainer className={cn('pb-[max(1.5rem,env(safe-area-inset-bottom))]', className)} {...props}>
            {children}
        </PageContainer>
    )
}

function PageMain({ children, className, width = 'full', ref, ...props }: PageMainProps) {
    const widthClass = width === 'full' ? 'max-w-none' : widthClassName[width]
    return <main ref={ref} className={cn('min-w-0', widthClass, className)} {...props}>{children}</main>
}

function PageLoading({ className, ...props }: HTMLAttributes<HTMLElement>) {
    return <section className={cn('flex min-h-[calc(100dvh-var(--spacing-header)-1rem)] items-center justify-center landscape:min-h-[calc(100dvh-var(--spacing-header))]', className)} {...props}><Spinner size="lg" /></section>
}

function PageCollectionContent({ children, className, ...props }: Omit<PageContainerProps, 'width'>) {
    return (
        <PageContainer className={cn('max-w-none pb-[max(1.5rem,env(safe-area-inset-bottom))]', className)} {...props}>
            {children}
        </PageContainer>
    )
}

export const Page = Object.assign(PageRoot, {
    Actions: PageActions,
    Container: PageContainer,
    CollectionContent: PageCollectionContent,
    Content: PageContent,
    Controls: PageControls,
    Description: PageDescription,
    Header: PageHeader,
    Loading: PageLoading,
    Main: PageMain,
    Heading: PageHeading,
    Title: PageTitle,
    Toolbar: PageToolbar,
})
