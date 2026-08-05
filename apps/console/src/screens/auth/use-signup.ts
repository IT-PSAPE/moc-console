import { useEffect, useState, type FormEvent } from "react"
import { fetchSignupWorkspaces } from "@/data/fetch-workspaces"
import { useAuth } from "@/lib/auth-context"
import type { Workspace } from "@moc/types/workspace"
import { MIN_PASSWORD_LENGTH } from "./password-strength-meter"

export function useSignup() {
  const { signUp } = useAuth()
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [workspaceSlug, setWorkspaceSlug] = useState("")
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspacesLoading, setWorkspacesLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchSignupWorkspaces()
      .then((list) => {
        if (cancelled) return
        setWorkspaces(list)
        const defaultWorkspace = list.find((workspace) => workspace.slug === "default-workspace") ?? list[0]
        if (defaultWorkspace) setWorkspaceSlug(defaultWorkspace.slug)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setWorkspacesLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    const trimmedName = name.trim()
    const trimmedSurname = surname.trim()
    if (!trimmedName || !trimmedSurname) {
      setError("Name and surname are required.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setLoading(true)
    const result = await signUp(email, password, trimmedName, trimmedSurname, workspaceSlug || undefined)
    if (result.error) setError(result.error.message)
    else setSuccess(true)
    setLoading(false)
  }

  function selectWorkspace(value: string | null) {
    setWorkspaceSlug(value ?? "")
  }

  const workspaceItems = workspacesLoading
    ? [{ label: "Loading workspaces…", value: "" }]
    : workspaces.length === 0
      ? [{ label: "No workspaces available", value: "" }]
      : workspaces.map((workspace) => ({ label: workspace.name, value: workspace.slug }))

  return {
    state: { name, surname, email, password, confirmPassword, workspaceSlug, error, success, loading },
    actions: { setName, setSurname, setEmail, setPassword, setConfirmPassword, selectWorkspace, submit },
    meta: { workspaces, workspacesLoading, workspaceItems },
  }
}
