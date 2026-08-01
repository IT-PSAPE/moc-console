import { Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import type { ChangeEvent } from "react"

type PasswordFieldProps = {
    value: string
    onChange: (next: string) => void
    onBlur?: () => void
    visible: boolean
    onToggleVisible: () => void
    placeholder?: string
    autoComplete?: string
    name: string
}

export function PasswordField({ value, onChange, onBlur, visible, onToggleVisible, placeholder, autoComplete, name }: PasswordFieldProps) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
        onChange(event.target.value)
    }

    return (
        <div className="relative">
            <Input
                aria-label={placeholder ?? "Password"}
                name={name}
                type={visible ? "text" : "password"}
                icon={<Lock />}
                value={value}
                onChange={handleChange}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete={autoComplete}
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
