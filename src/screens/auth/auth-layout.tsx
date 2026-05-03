import type { ReactNode } from "react"

export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-secondary px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-1">
                    <h1 className="title-h5">MOC Console</h1>
                    <p className="paragraph-sm text-tertiary">Church media production console</p>
                </div>
                <div className="rounded-xl border border-secondary bg-primary p-6 shadow-xs">
                    {children}
                </div>
            </div>
        </div>
    )
}
