export type DiscussionActorView = {
    name: string
    initials: string
    avatarUrl: string | null
    source: string | null
}

export type DiscussionTimeView = {
    relative: string
    exact: string
    clock: string
}

export type ActivityChangeView = { field: string; before: string; after: string }
export type ActivityView = {
    id: string
    actor: DiscussionActorView
    time: DiscussionTimeView
    action: string
    description: string | null
    changes: ActivityChangeView[]
    expandable: boolean
    changesLabel: string
}
export type ActivityGroupView = { key: string; label: string; items: ActivityView[] }
export type CommentView = { id: string; actor: DiscussionActorView; body: string; origin: string | null; time: DiscussionTimeView }
