import { useState, type ChangeEvent } from "react"
import type { VenueEventDraft } from "@/data/mutate-venue-events"
import type { VenueEventFormTarget } from "./use-venue-events-settings"

type VenueEventFormState = {
    name: string
    description: string
}

const emptyForm: VenueEventFormState = { name: "", description: "" }

function toFormState(target: VenueEventFormTarget | null): VenueEventFormState {
    if (!target || target.mode === "create") return emptyForm
    const { event } = target
    return {
        name: event.name,
        description: event.description ?? "",
    }
}

export function useVenueEventForm(target: VenueEventFormTarget | null, onSubmit: (draft: VenueEventDraft) => void, onClose: () => void) {
    const [form, setForm] = useState<VenueEventFormState>(() => toFormState(target))
    // Re-seed the draft when a new destination is opened, without an effect:
    // adjusting state during render (rather than after commit) avoids the
    // extra cascading render `useEffect` + `setState` would cause here.
    const [priorTarget, setPriorTarget] = useState(target)
    if (target !== priorTarget) {
        setPriorTarget(target)
        if (target) setForm(toFormState(target))
    }

    const trimmedName = form.name.trim()
    const canSubmit = trimmedName.length > 0 && trimmedName.length <= 120

    function changeName(changeEvent: ChangeEvent<HTMLInputElement>) {
        setForm((current) => ({ ...current, name: changeEvent.target.value }))
    }

    function changeDescription(changeEvent: ChangeEvent<HTMLTextAreaElement>) {
        setForm((current) => ({ ...current, description: changeEvent.target.value }))
    }

    function changeOpen(open: boolean) {
        if (!open) onClose()
    }

    function submit() {
        if (!canSubmit) return
        onSubmit({
            name: trimmedName,
            description: form.description.trim() || null,
        })
    }

    return { state: { form, canSubmit }, actions: { changeName, changeDescription, changeOpen, submit } }
}
