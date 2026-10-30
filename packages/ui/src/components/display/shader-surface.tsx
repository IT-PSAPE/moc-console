import type { ReactElement } from 'react'
import { cn } from '@moc/utils/cn'
import { useShaderSurface } from '../../hooks/use-shader-surface'

type ShaderSurfaceProps = { fragmentShader: string; colorTokens: readonly string[]; className?: string }

export function ShaderSurface({ fragmentShader, colorTokens, className }: ShaderSurfaceProps): ReactElement {
  const ref = useShaderSurface(fragmentShader, colorTokens)
  return <canvas ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 h-full w-full opacity-0 data-[ready]:opacity-100', className)} />
}
