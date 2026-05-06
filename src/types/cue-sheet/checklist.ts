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
    kind: 'template' | 'instance'
    templateId?: string
    name: string
    description: string
    scheduledAt?: string
    /** Top-level items not in any section — always shown at the top */
    items: ChecklistItem[]
    /** Grouped sections shown below ungrouped items */
    sections: ChecklistSection[]
    createdAt: string
    updatedAt: string
}

export type ChecklistItemAssignee = {
    checklistItemId: string
    userId: string
    duty: string
}

export const checklistItemDuties = [
    'Owner',
    'Reviewer',
    'Backup',
] as const
