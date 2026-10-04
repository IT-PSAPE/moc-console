import type { ChangeEvent, MouseEvent } from 'react'
import type { ScheduledAttendanceGroup } from '@moc/notifications'
import { Button } from '@moc/ui/components/controls/button'
import { FormField } from '@moc/ui/components/form/form-field'
import { Input } from '@moc/ui/components/form/input'
import { Paragraph } from '@moc/ui/components/display/text'

type ScheduledAttendanceGroupFieldsProps = { groups: ScheduledAttendanceGroup[]; disabled?: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void; onAdd: () => void; onRemove: (event: MouseEvent<HTMLButtonElement>) => void; onEnable: () => void; onClear: () => void }

export function ScheduledAttendanceGroupFields({ groups, disabled = false, onChange, onAdd, onRemove, onEnable, onClear }: ScheduledAttendanceGroupFieldsProps) {
    function removeGroup(event: MouseEvent<HTMLButtonElement>): void { onRemove(event) }
    function renderGroup(group: ScheduledAttendanceGroup, index: number) {
        return <div key={group.id} className="flex items-end gap-2">
            <div className="min-w-0 flex-1"><FormField label={`Group ${index + 1}`}><Input disabled={disabled} aria-label={`Group ${index + 1}`} data-group-id={group.id} value={group.label} maxLength={40} onChange={onChange} /></FormField></div>
            <Button variant="secondary" disabled={disabled || groups.length === 2} data-group-id={group.id} aria-label={`Remove group ${index + 1}`} onClick={removeGroup}>Remove</Button>
        </div>
    }
    if (!groups.length) return <div className="flex flex-col items-start gap-2"><Paragraph.sm className="text-tertiary">Let attendees choose from named groups before they submit attendance.</Paragraph.sm><Button variant="secondary" disabled={disabled} onClick={onEnable}>Add attendance groups</Button></div>
    return <div role="group" aria-label="Attendance groups" className="flex flex-col gap-3">
        <Paragraph.sm className="text-tertiary">Attendees choose one group when they respond. Group names can be changed later.</Paragraph.sm>
        {groups.map(renderGroup)}
        {groups.length < 8 ? <Button variant="secondary" disabled={disabled} onClick={onAdd}>Add group</Button> : null}
        {groups.length === 2 ? <Button variant="ghost" disabled={disabled} onClick={onClear}>Remove attendance groups</Button> : null}
    </div>
}
