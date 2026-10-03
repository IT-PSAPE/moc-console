import type { ReactNode } from 'react'
import { FormLabel } from './form-label'

/** Composes a label and any shared input primitive into a consistent field. */
export function FormField({label,children,optional=false}:{label:string;children:ReactNode;optional?:boolean}) {
  return <div className="flex flex-col gap-1.5"><FormLabel label={label} optional={optional}/>{children}</div>
}
