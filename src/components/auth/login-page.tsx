import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  const { actions: { login }, state: { isLoading } } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
    } catch {
      setError('Invalid credentials. Please try again.')
    }
  }

  function handleEmailChange(e: ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
  }

  function handlePasswordChange(e: ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-secondary p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-background-brand_solid text-lg font-bold text-static-white">
            M
          </div>
          <h1 className="text-xl font-semibold text-text-primary">MOC Console</h1>
          <p className="mt-1 text-sm text-text-tertiary">Sign in to your admin account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-border-error_subtle bg-background-error_primary px-4 py-2.5 text-sm text-text-error">
              {error}
            </div>
          )}

          <Input
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={handleEmailChange}
            placeholder="admin@moc.gov"
            required
          />

          <Input
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="Enter your password"
            required
          />

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>

          <p className="text-center text-xs text-text-quaternary">
            Demo: any email/password will work
          </p>
        </form>
      </div>
    </div>
  )
}
