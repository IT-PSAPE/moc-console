import { useState, type ChangeEvent } from "react"
import type { VenueDraft } from "@/data/mutate-venues"
import type { VenueFormTarget } from "./use-venues-settings"

type VenueFormState = {
    name: string
    location: string
    capacity: string
    notes: string
}

const emptyForm: VenueFormState = { name: "", location: "", capacity: "", notes: "" }

function toFormState(target: VenueFormTarget | null): VenueFormState {
    if (!target || target.mode === "create") return emptyForm
    const { venue } = target
    return {
        name: venue.name,
        location: venue.location ?? "",
        capacity: venue.capacity !== null ? String(venue.capacity) : "",
        notes: venue.notes ?? "",
    }
}

export function useVenueForm(target: VenueFormTarget | null, onSubmit: (draft: VenueDraft) => void, onClose: () => void) {
    const [form, setForm] = useState<VenueFormState>(() => toFormState(target))
    // Re-seed the draft when a new destination is opened, without an effect:
    // adjusting state during render (rather than after commit) avoids the
    // extra cascading render `useEffect` + `setState` would cause here.
    const [priorTarget, setPriorTarget] = useState(target)
    if (target !== priorTarget) {
        setPriorTarget(target)
        if (target) setForm(toFormState(target))
    }

    const trimmedName = form.name.trim()
    const trimmedCapacity = form.capacity.trim()
    const canSubmit = trimmedName.length > 0 && trimmedName.length <= 120 && (trimmedCapacity === "" || Number(trimmedCapacity) > 0)

    function changeName(event: ChangeEvent<HTMLInputElement>) {
        setForm((current) => ({ ...current, name: event.target.value }))
    }

    function changeLocation(event: ChangeEvent<HTMLInputElement>) {
        setForm((current) => ({ ...current, location: event.target.value }))
    }

    function changeCapacity(event: ChangeEvent<HTMLInputElement>) {
        setForm((current) => ({ ...current, capacity: event.target.value }))
    }

    function changeNotes(event: ChangeEvent<HTMLTextAreaElement>) {
        setForm((current) => ({ ...current, notes: event.target.value }))
    }

    function changeOpen(open: boolean) {
        if (!open) onClose()
    }

    function submit() {
        if (!canSubmit) return
        onSubmit({
            name: trimmedName,
            location: form.location.trim() || null,
            capacity: trimmedCapacity === "" ? null : Number(trimmedCapacity),
            notes: form.notes.trim() || null,
        })
    }

    return { state: { form, canSubmit }, actions: { changeName, changeLocation, changeCapacity, changeNotes, changeOpen, submit } }
}
