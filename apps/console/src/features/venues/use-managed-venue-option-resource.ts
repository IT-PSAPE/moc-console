import { useEffect } from "react"
import type { Venue, VenueEvent } from "@moc/types/venues"
import { fetchVenues } from "@/data/fetch-venues"
import { fetchVenueEvents } from "@/data/fetch-venue-events"
import { createVenue, setVenueActive, updateVenue } from "@/data/mutate-venues"
import { createVenueEvent, setVenueEventActive, updateVenueEvent } from "@/data/mutate-venue-events"
import { useWorkspace } from "@/lib/workspace-context"
import { useWorkspaceResource } from "@/hooks/use-workspace-resource"

type ManagedVenueOption = Venue | VenueEvent

type VenueOptionApi<Option extends ManagedVenueOption> = {
    resource: string
    fetch: (workspaceId: string) => Promise<Option[]>
    create: (name: string, workspaceId: string) => Promise<Option>
    rename: (option: Option, name: string, workspaceId: string) => Promise<Option>
    setActive: (option: Option, active: boolean, workspaceId: string) => Promise<Option>
}

const venueApi: VenueOptionApi<Venue> = {
    resource: "venues",
    fetch: fetchVenues,
    create: (name, workspaceId) => createVenue({ name, description: null }, workspaceId),
    rename: (venue, name, workspaceId) => updateVenue(venue.id, { name, description: venue.description }, workspaceId),
    setActive: async (venue, active, workspaceId) => {
        await setVenueActive(venue.id, active, workspaceId)
        return { ...venue, active }
    },
}

const eventApi: VenueOptionApi<VenueEvent> = {
    resource: "venue-events",
    fetch: fetchVenueEvents,
    create: (name, workspaceId) => createVenueEvent({ name, description: null }, workspaceId),
    rename: (event, name, workspaceId) => updateVenueEvent(event.id, { name, description: event.description }, workspaceId),
    setActive: async (event, active, workspaceId) => {
        await setVenueEventActive(event.id, active, workspaceId)
        return { ...event, active }
    },
}

function useManagedVenueOptionResource<Option extends ManagedVenueOption>(api: VenueOptionApi<Option>) {
    const { currentWorkspaceId } = useWorkspace()
    const { data: options, error, isLoading, isInitialLoading, load, updateData } = useWorkspaceResource({ emptyValue: [] as Option[], fetcher: api.fetch, resource: api.resource, workspaceId: currentWorkspaceId })

    useEffect(() => { void load() }, [load])

    async function create(name: string) {
        if (!currentWorkspaceId) throw new Error("Choose a workspace before creating an option.")
        const created = await api.create(name, currentWorkspaceId)
        updateData((current) => [...current, created])
        return created
    }

    async function rename(option: Option, name: string) {
        if (!currentWorkspaceId) throw new Error("Choose a workspace before renaming an option.")
        const updated = await api.rename(option, name, currentWorkspaceId)
        updateData((current) => current.map((item) => item.id === updated.id ? updated : item))
        return updated
    }

    async function changeActive(option: Option, active: boolean) {
        if (!currentWorkspaceId) throw new Error("Choose a workspace before changing an option.")
        const updated = await api.setActive(option, active, currentWorkspaceId)
        updateData((current) => current.map((item) => item.id === updated.id ? updated : item))
        return updated
    }

    return { workspaceId: currentWorkspaceId, options, error, isLoading, isInitialLoading, load, create, rename, changeActive }
}

export function useManagedVenueOptions() {
    return useManagedVenueOptionResource(venueApi)
}

export function useManagedVenueEventOptions() {
    return useManagedVenueOptionResource(eventApi)
}
