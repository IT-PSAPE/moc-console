import { cn } from '@moc/utils/cn'
import type { HTMLAttributes } from 'react'

type PageWidth = 'wide' | 'standard' | 'readable'

const widthClassName: Record<PageWidth, string> = {
    wide: 'max-w-content',
    standard: 'max-w-content-md',
    readable: 'max-w-content-sm',
}

type PageContainerProps = HTMLAttributes<HTMLDivElement> & {
    width?: PageWidth
}

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
        <header className={cn('mx-auto flex w-full max-w-content items-start gap-4 pt-6 pr-[max(var(--spacing-page-gutter),env(safe-area-inset-right))] pb-4 pl-[max(var(--spacing-page-gutter),env(safe-area-inset-left))] md:pt-page-top', className)} {...props}>
            {children}
        </header>
    )
}

function PageHeading({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex min-w-0 flex-1 flex-col gap-1.5', className)} {...props}>
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

function PageToolbar({ children, className, ...props }: PageContainerProps) {
    return (
        <PageContainer className={cn('flex flex-col gap-2 pb-4 md:flex-row md:items-center', className)} {...props}>
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
    Description: PageDescription,
    Header: PageHeader,
    Heading: PageHeading,
    Title: PageTitle,
    Toolbar: PageToolbar,
})
