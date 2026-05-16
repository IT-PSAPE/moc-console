import { Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"

type PasswordFieldProps = {
    value: string
    onChange: (next: string) => void
    onBlur?: () => void
    visible: boolean
    onToggleVisible: () => void
    placeholder?: string
    autoFocus?: boolean
    autoComplete?: string
}

export function PasswordField({ value, onChange, onBlur, visible, onToggleVisible, placeholder, autoFocus, autoComplete }: PasswordFieldProps) {
    return (
        <div className="relative">
            <Input
                type={visible ? "text" : "password"}
                icon={<Lock />}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                className="pr-10"
                required
            />
            <Button.Icon
                type="button"
                onClick={onToggleVisible}
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                variant="ghost"
                icon={visible ? <EyeOff /> : <Eye />}
                className="absolute inset-y-0 right-1 my-auto !py-0 text-tertiary hover:text-secondary"
            />
        </div>
    )
}
