import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cv } from "@moc/utils/cv";
import { cn } from "@moc/utils/cn";


type AvatarProps = {
    size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
            '2xl': ['size-24 rounded-full text-2xl'],
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
    return (
        <BaseAvatar.Root className={cn(variants({ size }), className)}>
            <BaseAvatar.Image
                src={src}
                alt={name ? `${name} avatar` : "Avatar"}
                className="w-full h-full object-cover"
            />
            {name ? <BaseAvatar.Fallback className="block text-center align-middle text-inherit">{name}</BaseAvatar.Fallback> : null}
        </BaseAvatar.Root>
    )
}

Avatar.initials = function AvatarInitials({ size, className, name }: AvatarProps & { name: string }) {
    return (
        <BaseAvatar.Root className={cn(variants({ size }), className)}>
            <BaseAvatar.Fallback className="block text-center align-middle text-inherit">{name}</BaseAvatar.Fallback>
        </BaseAvatar.Root>
    )
}
