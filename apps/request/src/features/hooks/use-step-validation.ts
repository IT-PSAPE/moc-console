import { useCallback, useState } from 'react'

export type StepValidationErrors = Record<string, string>

function focusField(id: string) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.focus()
  })
}

export function useStepValidation() {
  const [errors, setErrors] = useState<StepValidationErrors>({})

  const validate = useCallback((nextErrors: StepValidationErrors): boolean => {
    setErrors(nextErrors)

    const firstInvalidField = Object.keys(nextErrors)[0]
    if (firstInvalidField) {
      focusField(firstInvalidField)
      return false
    }

    return true
  }, [])

  const clearError = useCallback((id: string) => {
    setErrors((currentErrors) => {
      if (!currentErrors[id]) return currentErrors

      const remainingErrors = { ...currentErrors }
      delete remainingErrors[id]
      return remainingErrors
    })
  }, [])

  return {
    state: { errors },
    actions: { validate, clearError },
  }
}
