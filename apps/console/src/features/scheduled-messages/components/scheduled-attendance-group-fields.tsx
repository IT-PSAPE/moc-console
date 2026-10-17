import type { ChangeEvent, MouseEvent } from 'react'
import { Plus, X } from 'lucide-react'
import type { ScheduledAttendanceGroup } from '@moc/notifications'
import { Button } from '@moc/ui/components/controls/button'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { Input } from '@moc/ui/components/form/input'
import { Paragraph } from '@moc/ui/components/display/text'

type ScheduledAttendanceGroupFieldsProps = { groups: ScheduledAttendanceGroup[]; disabled?: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void; onAdd: () => void; onRemove: (event: MouseEvent<HTMLButtonElement>) => void; onEnable: () => void; onClear: () => void }

/**
 * One checkbox turns attendance groups on or off; when on, the group names are
 * a compact editable list (2–8 groups). Keeps the parent's editor callbacks.
 */
export function ScheduledAttendanceGroupFields({ groups, disabled = false, onChange, onAdd, onRemove, onEnable, onClear }: ScheduledAttendanceGroupFieldsProps) {
    const enabled = groups.length > 0

    function toggleGroups(event: ChangeEvent<HTMLInputElement>): void {
        if (event.target.checked) onEnable()
        else onClear()
    }

    function renderGroup(group: ScheduledAttendanceGroup, index: number) {
        return <div key={group.id} className="flex items-center gap-2">
            <Input className="flex-1" disabled={disabled} aria-label={`Group ${index + 1}`} data-group-id={group.id} value={group.label} maxLength={40} onChange={onChange} />
            <Button.Icon size="sm" variant="ghost" icon={<X />} disabled={disabled || groups.length <= 2} data-group-id={group.id} aria-label={`Remove group ${index + 1}`} onClick={onRemove} />
        </div>
    }

    return <div className="flex flex-col gap-3">
        <Checkbox checked={enabled} disabled={disabled} onChange={toggleGroups}>Let attendees choose a group</Checkbox>
        {enabled ? <div role="group" aria-label="Attendance groups" className="flex flex-col gap-2 pl-6">
            <Paragraph.xs className="text-tertiary">Attendees pick one group when they respond. Names can be changed later.</Paragraph.xs>
            {groups.map(renderGroup)}
            {groups.length < 8 ? <Button size="sm" variant="secondary" className="w-fit" icon={<Plus />} disabled={disabled} onClick={onAdd}>Add group</Button> : null}
        </div> : null}
    </div>
}
