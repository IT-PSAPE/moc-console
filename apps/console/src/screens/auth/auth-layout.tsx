import type { ReactNode } from "react"
import { SkipLink } from "@moc/ui/components/navigation/skip-link"
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
            <div className="w-full max-w-md space-y-5">
                <div className="text-center space-y-1">
                    <h1 className="title-h5">MOC Console</h1>
                    <p className="paragraph-sm text-tertiary">
                        Church media production console
                    </p>
                </div>
                {showSteps && <AuthFlowSteps current={step} total={totalSteps} />}
                <main id="main-content" tabIndex={-1} className="rounded-xl border border-secondary bg-primary p-6 shadow-xs outline-none">
                    {children}
                </main>
            </div>
        </div>
    )
}
