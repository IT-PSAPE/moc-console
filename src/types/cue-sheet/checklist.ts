export type ChecklistItem = {
    id: string
    label: string
    checked: boolean
}

export type ChecklistSection = {
    id: string
    name: string
    items: ChecklistItem[]
}

export type Checklist = {
    id: string
    name: string
    description: string
    /** Top-level items not in any section — always shown at the top */
    items: ChecklistItem[]
    /** Grouped sections shown below ungrouped items */
    sections: ChecklistSection[]
    createdAt: string
    updatedAt: string
}
