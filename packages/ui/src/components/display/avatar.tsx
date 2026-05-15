import { cv } from "@moc/utils/cv";
import { cn } from "@moc/utils/cn";
import { useState } from "react";


type AvatarProps = {
    size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string
}

const variants = cv({
    base: [ 'overflow-clip shrink-0 bg-brand_primary flex items-center justify-center text-brand_secondary' ],
    variants: {
        size: {
            '2xs': ['size-5 rounded-full text-[9px] leading-none'],
            xs: ['size-6 rounded-md'],
            sm: ['size-8 rounded-lg'],
            md: ['size-10 rounded-lg'],
            lg: ['size-12 rounded-lg'],
            xl: ['size-14 rounded-lg'],
        },
    },
    defaultVariants: {
        size: 'md',
    },
})

type AvatarImageProps = AvatarProps & {
    src: string
    /** Initials shown if the image fails to load. */
    name?: string
}

export function Avatar({ size, className, src, name }: AvatarImageProps) {
    const [failed, setFailed] = useState(false)
    const [prevSrc, setPrevSrc] = useState(src)

    if (src !== prevSrc) {
        setPrevSrc(src)
        setFailed(false)
    }

    if (failed && name) {
        return (
            <div className={cn(variants({ size }), className)}>
                <span className="block text-center align-middle text-inherit">{name}</span>
            </div>
        )
    }

    return (
        <div className={cn(variants({ size }), className)}>
            <img
                src={src}
                alt={name ? `${name} avatar` : "Avatar"}
                className="w-full h-full object-cover"
                onError={() => setFailed(true)}
            />
        </div>
    )
}

Avatar.initials = function AvatarInitials({ size, className, name }: AvatarProps & { name: string }) {
    return (
        <div className={cn(variants({ size }), className)}>
            <span className="block text-center align-middle text-inherit">{name}</span>
        </div>
    )
}
