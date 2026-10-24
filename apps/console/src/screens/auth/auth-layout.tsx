import type { ReactNode } from "react"
import { Card } from "@moc/ui/components/display/card"
import { SkipLink } from "@moc/ui/components/navigation/skip-link"
import { Paragraph } from "@moc/ui/components/display/text"

type AuthLayoutProps = {
    children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-secondary px-page-gutter py-8">
            <SkipLink />
            <Card className="w-full max-w-sm gap-5 p-6">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="title-h5">MOC Console</h1>
                    <Paragraph.sm className="text-tertiary">
                        Church media production console
                    </Paragraph.sm>
                </div>
                <main id="main-content" tabIndex={-1} className="outline-none">
                    {children}
                </main>
            </Card>
        </div>
    )
}
