import { useState, type ChangeEvent } from 'react'

type Draft = { name: string; description: string | null }
type Form = { name: string; description: string }

export function useRequestOptionForm(target: object | null, initial: Draft | null, onSubmit: (draft: Draft) => void, onClose: () => void) {
    const [form, setForm] = useState<Form>({ name: initial?.name ?? '', description: initial?.description ?? '' })
    const [priorTarget, setPriorTarget] = useState(target)
    if (target !== priorTarget) {
        setPriorTarget(target)
        if (target) setForm({ name: initial?.name ?? '', description: initial?.description ?? '' })
    }
    const trimmedName = form.name.trim()
    const canSubmit = trimmedName.length > 0 && trimmedName.length <= 120

    function changeName(event: ChangeEvent<HTMLInputElement>): void {
        setForm(current => ({ ...current, name: event.target.value }))
    }
    function changeDescription(event: ChangeEvent<HTMLTextAreaElement>): void {
        setForm(current => ({ ...current, description: event.target.value }))
    }
    function changeOpen(open: boolean): void {
        if (!open) onClose()
    }
    function submit(): void {
        if (canSubmit) onSubmit({ name: trimmedName, description: form.description.trim() || null })
    }
    return { state: { form, canSubmit }, actions: { changeName, changeDescription, changeOpen, submit } }
}
