import { cn } from '@/utils/cn';

function HeaderRoot({ children, className }: { children?: React.ReactNode; className?: string}) {
    return (
        <div className={cn("flex items-center w-full", className)}>
                {children}
        </div>
    );
}


function HeaderLead({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex flex-col items-start flex-1", className)}>
            {children}
        </div>
    )
}

function HeaderTrail({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("flex", className)}>
            {children}
        </div>
    )
}

export const Header = {
    Root: HeaderRoot,
    Lead: HeaderLead,
    Trail: HeaderTrail,
}