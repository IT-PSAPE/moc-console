import { cn } from "@moc/utils/cn"

export type PasswordStrength = "weak" | "medium" | "strong"

export const MIN_PASSWORD_LENGTH = 8

export function evaluatePasswordStrength(password: string): PasswordStrength {
    if (password.length < MIN_PASSWORD_LENGTH) return "weak"
    let signals = 0
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) signals++
    if (/\d/.test(password)) signals++
    if (/[^a-zA-Z0-9]/.test(password)) signals++
    if (password.length >= 14) signals++
    if (signals >= 3) return "strong"
    if (signals >= 1) return "medium"
    return "weak"
}

export function PasswordStrengthMeter({ strength, tooShort }: { strength: PasswordStrength; tooShort: boolean }) {
    const filled = strength === "weak" ? 1 : strength === "medium" ? 2 : 3
    const label = strength === "weak" ? "Weak" : strength === "medium" ? "OK" : "Strong"
    const hint = tooShort
        ? `Keep going — minimum is ${MIN_PASSWORD_LENGTH} characters.`
        : strength === "medium"
          ? "Looking good. Mix in numbers or symbols to make it stronger."
          : null
    return (
        <div className="space-y-1 pt-1">
            <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors duration-300",
                                i <= filled ? "bg-brand_solid" : "bg-quaternary",
                            )}
                        />
                    ))}
                </div>
                <span className="label-xs text-tertiary whitespace-nowrap">{label}</span>
            </div>
            {hint && <p className="paragraph-xs text-tertiary">{hint}</p>}
        </div>
    )
}
