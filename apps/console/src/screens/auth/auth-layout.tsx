import type { ReactNode } from "react"
import { cn } from "@moc/utils/cn"

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
        <div className="flex min-h-dvh items-center justify-center bg-secondary px-4 py-8">
            <div className="w-full max-w-md space-y-5">
                <div className="text-center space-y-1">
                    <h1 className="title-h5">MOC Console</h1>
                    <p className="paragraph-sm text-tertiary">
                        Church media production console
                    </p>
                </div>
                {showSteps && <FlowSteps current={step} total={totalSteps} />}
                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                    {children}
                </div>
            </div>
        </div>
    )
}

function FlowSteps({ current, total }: { current: number; total: number }) {
    return (
        <div
            className="flex items-center gap-1.5 px-1"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={current}
            aria-label={`Step ${current} of ${total}`}
        >
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-500",
                        i + 1 <= current ? "bg-brand_solid" : "bg-quaternary",
                    )}
                />
            ))}
        </div>
    )
}
