import { useState, type ChangeEvent } from "react"
import type { RequestCategoryDraft } from "@/data/mutate-request-categories"
import type { RequestCategoryFormTarget } from "./use-request-categories-settings"

type RequestCategoryFormState = {
    name: string
    active: boolean
}

const emptyForm: RequestCategoryFormState = { name: "", active: true }

function toFormState(target: RequestCategoryFormTarget | null): RequestCategoryFormState {
    if (!target || target.mode === "create") return emptyForm
    return { name: target.category.name, active: target.category.active }
}

export function useRequestCategoryForm(target: RequestCategoryFormTarget | null, onSubmit: (draft: RequestCategoryDraft) => void, onClose: () => void) {
    const [form, setForm] = useState<RequestCategoryFormState>(() => toFormState(target))
    const [priorTarget, setPriorTarget] = useState(target)

    if (target !== priorTarget) {
        setPriorTarget(target)
        if (target) setForm(toFormState(target))
    }

    const trimmedName = form.name.trim()
    const canSubmit = trimmedName.length > 0 && trimmedName.length <= 120

    function changeName(event: ChangeEvent<HTMLInputElement>) {
        setForm((current) => ({ ...current, name: event.target.value }))
    }

    function changeActive(active: boolean) {
        setForm((current) => ({ ...current, active }))
    }

    function changeOpen(open: boolean) {
        if (!open) onClose()
    }

    function submit() {
        if (!canSubmit) return
        onSubmit({ name: trimmedName, active: form.active })
    }

    return { state: { form, canSubmit }, actions: { changeName, changeActive, changeOpen, submit } }
}
