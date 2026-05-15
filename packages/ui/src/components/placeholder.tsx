import type { HTMLAttributes } from "react";

export function Placeholder({ children }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className="w-full h-full flex justify-center items-center outline outline-gray-300 outline-dashed -outline-offset-10">
            {children}
        </div>
    )
}