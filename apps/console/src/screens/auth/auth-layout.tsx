import type { ReactNode } from "react"
import { SkipLink } from "@moc/ui/components/navigation/skip-link"
import { Paragraph } from "@moc/ui/components/display/text"
import { AuthFlowSteps } from "./auth-flow-steps"

type AuthLayoutProps = {
    children: ReactNode
    step?: number
    totalSteps?: number
}

export function AuthLayout({ children, step, totalSteps }: AuthLayoutProps) {
    const showSteps =
        typeof step === "number" &&
        typeof totalSteps === "number" &&
        totalSteps > 1

    return (
        <div className="flex min-h-dvh items-center justify-center bg-secondary px-page-gutter py-8">
            <SkipLink />
            <div className="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="title-h5">MOC Console</h1>
                    <Paragraph.sm className="text-tertiary">
                        Church media production console
                    </Paragraph.sm>
                </div>
                {showSteps && <AuthFlowSteps current={step} total={totalSteps} />}
                <main id="main-content" tabIndex={-1} className="outline-none">
                    {children}
                </main>
            </div>
        </div>
    )
}
