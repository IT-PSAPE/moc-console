import type { HTMLAttributes } from "react";

export function Placeholder({ children }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className="w-full h-full flex justify-center items-center outline outline-border-primary outline-dashed -outline-offset-10">
            {children}
        </div>
    )
}
