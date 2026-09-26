import type { ComponentProps } from 'react'

type ColorSchemeImageProps = Omit<ComponentProps<'img'>, 'src' | 'srcSet'> & {
  lightSrc: string
  darkSrc: string
  pictureClassName?: string
}

export function ColorSchemeImage({ lightSrc, darkSrc, pictureClassName, ...imageProps }: ColorSchemeImageProps) {
  return (
    <picture className={pictureClassName}>
      <source media="(prefers-color-scheme: dark)" srcSet={darkSrc} />
      <img src={lightSrc} {...imageProps} />
    </picture>
  )
}
